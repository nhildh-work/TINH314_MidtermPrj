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

    // 1. Thêm xử lý nội dung chuyển khoản Ký Quỹ (VD: SAFEPASS KYQUY <user_id>)
    if (upperContent.includes("SAFEPASS") && upperContent.includes("KYQUY")) {
      const parts = upperContent.split("KYQUY");
      if (parts[1]) {
        const userId = parts[1].trim().split(" ")[0];
        const { error: updateProfileErr } = await supabase
          .from("profiles")
          .update({ role: "seller" }) // Cập nhật quyền seller khi nạp ký quỹ thành công
          .eq("id", userId);

        if (!updateProfileErr) {
          processed++;
          console.log(`✅ Confirmed deposit for user ${userId}`);
          continue;
        } else {
          console.error(`Failed to update profile for user ${userId}:`, updateProfileErr);
        }
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