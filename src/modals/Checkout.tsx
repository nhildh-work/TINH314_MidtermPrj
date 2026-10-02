import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { PolicyModal } from "../components/PolicyModal";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

function generateRefCode(ticketId: string | number) {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `SP${ticketId}${randomSuffix}`;
}

export default function CheckoutModal() {
  const { checkoutTicket, closeCheckout, addToCart, currentUser, setAuthModal, addPurchasedTicket, nav } = useApp();
  const [agreed, setAgreed] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [done, setDone] = useState(false);
  const [refCode, setRefCode] = useState<string>("");
  const [qrReady, setQrReady] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const handleClose = async () => {
    if (paymentStatus === "pending" && refCode && checkoutTicket?.id) {
      try {
        await supabase.from("transactions").delete().eq("reference_code", refCode);
        await supabase.from("tickets").update({ status: "available" }).eq("id", checkoutTicket.id);
      } catch (err) {
        console.warn("Lỗi dọn dẹp transaction pending:", err);
      }
    }
    closeCheckout();
  };

  useEffect(() => {
    if (!checkoutTicket || !currentUser) return;

    const code = generateRefCode(checkoutTicket.id);
    setRefCode(code);

    const fee = Math.round(checkoutTicket.price * 0.05);
    const total = checkoutTicket.price + fee;

    async function initTransaction() {
      try {
        if (checkoutTicket && checkoutTicket.id) {
          // CHỐNG 1 TICKET NHIỀU DÒNG PENDING: Xóa sạch các transaction pending cũ của ticket_id này
          await supabase
            .from("transactions")
            .delete()
            .eq("ticket_id", checkoutTicket.id)
            .eq("status", "pending");

          // TẠO DUY NHẤT 1 TRANSACTION PENDING MỚI
          await supabase.from("transactions").insert({
            ticket_id: checkoutTicket.id,
            buyer_id: currentUser!.id,
            amount: total,
            status: "pending",
            reference_code: code,
          });

          await supabase
            .from("tickets")
            .update({ status: "locked" })
            .eq("id", checkoutTicket.id);
        }
      } catch (err) {
        console.warn("Lỗi khởi tạo giao dịch:", err);
      } finally {
        setQrReady(true);
      }
    }

    initTransaction();
  }, [checkoutTicket?.id, currentUser?.id]);

  useEffect(() => {
    if (!qrReady || paymentStatus === "paid" || !refCode) return;

    const channel = supabase
      .channel(`tx-${refCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `reference_code=eq.${refCode}`,
        },
        (payload) => {
          const st = (payload.new as any)?.status;
          if (st === "paid" || st === "completed") {
            completePurchase();
          }
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("transactions")
          .select("status")
          .eq("reference_code", refCode)
          .maybeSingle();

        if (data?.status === "paid" || data?.status === "completed") {
          completePurchase();
          clearInterval(interval);
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [qrReady, paymentStatus, refCode]);

  if (!checkoutTicket) return null;

  const fee = Math.round(checkoutTicket.price * 0.05);
  const total = checkoutTicket.price + fee;
  const qrUrl = refCode
    ? `https://img.vietqr.io/image/mb-04111724267899-compact2.png?amount=${total}&addInfo=${refCode}&accountName=NGUYEN DINH NGUYEN`
    : "";

  const completePurchase = async () => {
    setPaymentStatus("paid");

    if (checkoutTicket && checkoutTicket.id) {
      await supabase
        .from("tickets")
        .update({ status: "sold" })
        .eq("id", checkoutTicket.id);
    }

    addToCart();
    addPurchasedTicket({
      id: checkoutTicket.id || Date.now(),
      eventTitle: checkoutTicket.eventTitle,
      eventImage: checkoutTicket.eventImage,
      tier: checkoutTicket.tier,
      date: checkoutTicket.eventDate || "Sắp diễn ra",
      venue: checkoutTicket.venue || checkoutTicket.city || "TP.HCM",
      price: total,
      status: "paid", 
    });

    setDone(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
        onClick={handleClose}
      >
        <div
          className="sp-card w-full max-w-2xl overflow-y-auto"
          style={{ maxHeight: "92vh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <div>
                <h2 className="font-display font-800 text-white text-lg">Thanh toán Chuyển khoản VietQR</h2>
                <p className="text-[11px] text-gray-400">Giao dịch được bảo vệ ký quỹ SafePass Escrow</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full text-gray-400 hover:text-white">✕</button>
          </div>

          {done ? (
            /* POPUP THÀNH CÔNG DÀNH CHO CẢ MUA VÉ VÀ ĐĂNG VÉ CỌC */
            <div className="p-10 text-center space-y-4">
              <div className="text-6xl animate-bounce">🎉</div>
              <h3 className="font-display font-800 text-white text-2xl">Thanh Toán & Giao Dịch Thành Công!</h3>
              <p className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
                Hệ thống SafePass đã xác nhận biến động số dư. Vé điện tử chính thức đã được kích hoạt và chuyển trực tiếp vào mục <strong className="text-purple-400">"Vé Của Tôi"</strong>.
              </p>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 text-left max-w-md mx-auto space-y-1.5">
                <p>• Mã giao dịch: <strong className="font-mono text-amber-300">{refCode}</strong></p>
                <p>• Sự kiện: <strong>{checkoutTicket.eventTitle}</strong> ({checkoutTicket.tier})</p>
                <p>• Trạng thái Escrow: <strong className="text-emerald-400">Đã phong tỏa an toàn qua hợp đồng Escrow</strong></p>
              </div>
              <div className="flex justify-center gap-3 pt-3">
                <button
                  onClick={() => { closeCheckout(); nav("my-tickets"); }}
                  className="sp-btn-primary px-8 py-3 font-display font-700 text-sm cursor-pointer shadow-lg"
                >
                  Xem vé trong kho ngay →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-6 border-r border-white/5">
                <div className="rounded-2xl p-4 flex flex-col items-center bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-1.5 text-xs font-700 text-emerald-400 mb-3 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span>📱</span>
                    <span>Quét mã QR bằng App Ngân hàng bất kỳ</span>
                  </div>

                  <div className="relative mb-4 bg-white p-2 rounded-2xl shadow-xl">
                    <img src={qrUrl} alt="VietQR" className="rounded-xl" style={{ width: 210, height: 210 }} />
                  </div>

                  <div className="w-full rounded-xl p-3.5 bg-black/50 border border-white/8 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Ngân hàng:</span>
                      <span className="font-700 text-white">🏦 MB Bank (Quân Đội)</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-700 text-white">04111724267899</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("04111724267899");
                            setCopiedAcc(true);
                            setTimeout(() => setCopiedAcc(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-gray-300"
                        >
                          {copiedAcc ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Số tiền:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-800 text-emerald-400">{fmt(total)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(total));
                            setCopiedAmount(true);
                            setTimeout(() => setCopiedAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-gray-300"
                        >
                          {copiedAmount ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/8">
                      <span className="text-purple-300 font-700">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-800 text-purple-300">{refCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(refCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-purple-500/25 text-[10px] text-purple-300"
                        >
                          {copiedCode ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-72 p-6 shrink-0 flex flex-col justify-between">
                <div>
                  <p className="sp-filter-label mb-3">Tóm tắt đơn hàng</p>
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-2 text-xs">
                    <p className="font-bold text-white">{checkoutTicket.eventTitle}</p>
                    <p className="text-purple-400">{checkoutTicket.tier}</p>
                    <div className="flex justify-between text-gray-400 pt-2 border-t border-white/5">
                      <span>Tổng tiền</span>
                      <span className="font-bold text-white">{fmt(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <PolicyModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}