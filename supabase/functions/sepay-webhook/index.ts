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

  const transfers = (body?.data as Record<string, unknown>[]) ?? [];
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
    const transferAmount = transfer.transferAmount as number;
    const content = (transfer.content as string | undefined) ?? "";

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

    // 2. Logic gốc xử lý thanh toán mua vé qua mã SP-...
    const match = content.match(/SP-?(\d{3,10})/i);
    if (!match) continue;
    const digits = match[1];
    const refCode = `SP${digits}`;
    const altRefCode = `SP-${digits}`;

    // Look up the transaction by reference_code (supports both SP123456 and SP-123456)
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("id, amount, ticket_id, status")
      .or(`reference_code.eq.${refCode},reference_code.eq.${altRefCode}`)
      .maybeSingle();

    if (txErr || !tx) {
      console.error(`Transaction not found for ref ${refCode}:`, txErr);
      continue;
    }

    if (tx.status === "paid") {
      // Already confirmed, skip
      continue;
    }

    if (transferAmount >= tx.amount) {
      // Mark transaction as paid
      const { error: updateTxErr } = await supabase
        .from("transactions")
        .update({ status: "paid" })
        .eq("id", tx.id);

      if (updateTxErr) {
        console.error(`Failed to update transaction ${tx.id}:`, updateTxErr);
        continue;
      }

      // Kiểm tra trạng thái hiện tại của vé: nếu là pending_deposit (người bán nạp cọc) thì chuyển sang available, còn người mua mua vé thì chuyển sang sold
      const { data: ticketData } = await supabase
        .from("tickets")
        .select("status")
        .eq("id", tx.ticket_id)
        .maybeSingle();

      const nextStatus = ticketData?.status === "pending_deposit" ? "available" : "sold";

      const { error: updateTicketErr } = await supabase
        .from("tickets")
        .update({ status: nextStatus })
        .eq("id", tx.ticket_id);

      if (updateTicketErr) {
        console.error(`Failed to update ticket ${tx.ticket_id}:`, updateTicketErr);
      }

      processed++;
      console.log(`✅ Confirmed payment for ${refCode}, ticket ${tx.ticket_id}`);
    } else {
      console.warn(
        `⚠️ Underpayment for ${refCode}: received ${transferAmount}, expected ${tx.amount}`,
      );
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed }),
    { headers: { "Content-Type": "application/json" } },
  );
});