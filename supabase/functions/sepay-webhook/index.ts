import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // SePay will POST to this endpoint
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Hỗ trợ tất cả định dạng SePay gửi: phẳng (body), bọc trong data (body.data), mảng (array)
  let transfers: Record<string, unknown>[] = [];
  if (Array.isArray(body)) {
    transfers = body as Record<string, unknown>[];
  } else if (Array.isArray(body?.data)) {
    transfers = body.data as Record<string, unknown>[];
  } else if (body?.data && typeof body.data === "object") {
    transfers = [body.data as Record<string, unknown>];
  } else if (body?.content || body?.transferAmount || body?.id) {
    transfers = [body];
  }

  if (transfers.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // bypass RLS
  );

  let processed = 0;

  for (const transfer of transfers) {
    const transferAmount = Number(transfer.transferAmount || transfer.amount || 0);
    const content = String(transfer.content || transfer.description || "").trim();

    if (!content) continue;

    const upperContent = content.toUpperCase();

    // 1. Xử lý nội dung chuyển khoản ĐÓNG CỌC KÝ QUỸ (VD: SAFEPASS KYQUY <ticket_id>)
    if (upperContent.includes("KYQUY")) {
      // Tìm số ID vé từ nội dung cọc (VD: SAFEPASS KYQUY 13)
      const ticketMatch = content.match(/KYQUY\s*(\d+)/i) || content.match(/(\d+)/);
      if (ticketMatch) {
        const ticketId = Number(ticketMatch[1]);

        // Tìm seller_id của vé
        const { data: tkInfo } = await supabase
          .from("tickets")
          .select("seller_id")
          .eq("id", ticketId)
          .maybeSingle();

        if (tkInfo?.seller_id) {
          // Cập nhật tất cả các vé đang chờ cọc của người bán này thành mở bán
          await supabase
            .from("tickets")
            .update({ status: "available" })
            .eq("seller_id", tkInfo.seller_id)
            .eq("status", "pending_deposit");
        } else {
          await supabase
            .from("tickets")
            .update({ status: "available" })
            .eq("id", ticketId);
        }

        // Cập nhật hoặc ghi nhận giao dịch thành công
        const { data: existingTx } = await supabase
          .from("transactions")
          .select("id")
          .eq("ticket_id", ticketId)
          .maybeSingle();

        if (existingTx?.id) {
          await supabase
            .from("transactions")
            .update({ status: "paid" })
            .eq("id", existingTx.id);
        } else {
          await supabase.from("transactions").insert({
            ticket_id: ticketId,
            reference_code: `SAFEPASS KYQUY ${ticketId}`,
            status: "paid",
            amount: transferAmount,
          });
        }

        processed++;
        console.log(`✅ Đã xác nhận đóng cọc ký quỹ cho vé #${ticketId}`);
        continue;
      }
    }

    // 2. Xử lý mã giao dịch vé SafePass: SP{ticketId}{randomSuffix} hoặc SP-{ticketId}
    const match = content.match(/SP-?(\d{2,12})/i);
    if (!match) continue;
    const digits = match[1];
    const refCode = `SP${digits}`;
    const altRefCode = `SP-${digits}`;

    // Tìm kiếm trong transactions trước
    const { data: tx } = await supabase
      .from("transactions")
      .select("id, amount, ticket_id, status")
      .or(`reference_code.eq.${refCode},reference_code.eq.${altRefCode}`)
      .maybeSingle();

    let targetTicketId: number | null = tx?.ticket_id ? Number(tx.ticket_id) : null;

    // Nếu không tìm thấy transaction (do RLS phía frontend chưa lưu), suy ra ticketId từ mã SP
    // Quy tắc tạo mã: SP + ticketId + 4 số ngẫu nhiên (VD: ticketId=13, suffix=9704 => SP139704)
    if (!targetTicketId) {
      if (digits.length > 4) {
        targetTicketId = Number(digits.slice(0, -4));
      } else {
        targetTicketId = Number(digits);
      }
    }

    // Kiểm tra vé tồn tại
    if (targetTicketId) {
      const { data: ticketData } = await supabase
        .from("tickets")
        .select("id, status, price, seller_id")
        .eq("id", targetTicketId)
        .maybeSingle();

      if (ticketData) {
        // Cập nhật trạng thái vé:
        // pending_deposit (Người bán nạp cọc) -> available (Đang bán)
        // available (Người mua mua vé) -> sold (Đã bán)
        const nextStatus = ticketData.status === "pending_deposit" ? "available" : "sold";

        await supabase
          .from("tickets")
          .update({ status: nextStatus })
          .eq("id", targetTicketId);

        // Lưu / cập nhật bảng transactions bằng Service Role (bỏ qua RLS)
        if (tx?.id) {
          await supabase
            .from("transactions")
            .update({ status: "paid" })
            .eq("id", tx.id);
        } else {
          await supabase.from("transactions").insert({
            ticket_id: targetTicketId,
            reference_code: refCode,
            status: "paid",
            amount: transferAmount || ticketData.price,
          });
        }

        processed++;
        console.log(`✅ [SePay Webhook] Xác nhận thành công vé #${targetTicketId} chuyển sang [${nextStatus}] (Ref: ${refCode})`);
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed }),
    { headers: { "Content-Type": "application/json" } },
  );
});