import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { PolicyModal } from "../components/PolicyModal";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

function generateRefCode() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `SP${digits}`;
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

  // Xử lý dọn dẹp transaction pending rác khi tắt Modal mà chưa thanh toán
  const handleClose = async () => {
    if (paymentStatus === "pending" && refCode && checkoutTicket?.id) {
      try {
        await supabase.from("transactions").delete().eq("reference_code", refCode);
        await supabase.from("tickets").update({ status: "available" }).eq("id", checkoutTicket.id);
      } catch (err) {
        console.warn("Lỗi dọn dẹp giao dịch pending:", err);
      }
    }
    closeCheckout();
  };

  useEffect(() => {
    if (!checkoutTicket) return;
    if (!currentUser) {
      setAuthModal("login");
      return;
    }

    const code = generateRefCode();
    setRefCode(code);

    const fee = Math.round(checkoutTicket.price * 0.05);
    const total = checkoutTicket.price + fee;

    async function initTransaction() {
      try {
        if (checkoutTicket && checkoutTicket.id && typeof checkoutTicket.id === "number") {
          await supabase.from("transactions").insert({
            ticket_id: checkoutTicket.id,
            buyer_id: currentUser!.id,
            amount: total,
            status: "pending",
            reference_code: code,
          });

          // Tạm khóa vé trong lúc chờ chuyển khoản
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
  }, [checkoutTicket, currentUser]);

  useEffect(() => {
    if (!qrReady || paymentStatus === "paid" || !refCode) return;

    // Lắng nghe SePay Webhook cập nhật trạng thái giao dịch
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
      try {
        await supabase
          .from("tickets")
          .update({ status: "sold" })
          .eq("id", checkoutTicket.id);
      } catch (err) {
        console.error("Lỗi cập nhật vé sang sold:", err);
      }
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
                <p className="text-[11px] text-gray-400">Giao dịch được bảo vệ và ký quỹ qua cổng thanh toán tự động</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {done ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="font-display font-800 text-white text-xl mb-2">Thanh toán thành công!</h3>
              <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
                Hệ thống đã nhận diện biến động số dư. Vé của bạn đã sẵn sàng sử dụng trong mục "Vé Của Tôi".
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    closeCheckout();
                    nav("my-tickets");
                  }}
                  className="sp-btn-primary px-6 py-2.5 font-display font-700"
                >
                  Xem vé của tôi
                </button>
                <button
                  onClick={closeCheckout}
                  className="sp-btn-ghost px-5 py-2.5 font-display font-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-6" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <div
                  className="rounded-2xl p-4 flex flex-col items-center"
                  style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.18)" }}
                >
                  <div className="flex items-center gap-1.5 text-xs font-700 text-emerald-400 mb-3 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span>📱</span>
                    <span>Quét mã QR bằng App Ngân hàng bất kỳ</span>
                  </div>

                  <div className="relative mb-4 bg-white p-2 rounded-2xl shadow-xl">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt="Mã QR Chuyển khoản VietQR"
                        className="rounded-xl"
                        style={{ width: 210, height: 210 }}
                      />
                    ) : (
                      <div className="w-[210px] h-[210px] flex items-center justify-center text-xs text-gray-500">
                        Đang tạo mã VietQR...
                      </div>
                    )}
                  </div>

                  <div className="w-full rounded-xl p-3.5 bg-black/50 border border-white/8 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Ngân hàng:</span>
                      <span className="font-700 text-white flex items-center gap-1">
                        🏦 MB Bank (Quân Đội)
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-700 text-white text-sm">04111724267899</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("04111724267899");
                            setCopiedAcc(true);
                            setTimeout(() => setCopiedAcc(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-600 text-gray-300 hover:text-white transition-colors"
                        >
                          {copiedAcc ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Chủ tài khoản:</span>
                      <span className="font-700 text-white uppercase">NGUYEN DINH NGUYEN</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Số tiền:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-800 text-emerald-400 text-sm">{fmt(total)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(total));
                            setCopiedAmount(true);
                            setTimeout(() => setCopiedAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-600 text-gray-300 hover:text-white transition-colors"
                        >
                          {copiedAmount ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/8">
                      <span className="text-purple-300 font-700">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-800 text-purple-300 text-sm tracking-wider">{refCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(refCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-purple-500/25 text-[10px] font-700 text-purple-300 hover:text-white transition-colors"
                        >
                          {copiedCode ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-3.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 w-full">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <p className="text-[11px] font-600 text-amber-300 leading-snug text-center">
                      Đang chờ hệ thống tự động xác nhận chuyển khoản...
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-72 p-6 shrink-0 flex flex-col justify-between">
                <div>
                  <p className="sp-filter-label mb-3">Tóm tắt đơn hàng</p>

                  <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <img src={checkoutTicket.eventImage} alt={checkoutTicket.eventTitle} className="w-full h-28 object-cover" />
                    <div className="p-3">
                      <p className="text-xs font-600 text-white mb-1 line-clamp-2">{checkoutTicket.eventTitle}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-700 px-1.5 py-0.5 rounded"
                          style={{ color: checkoutTicket.tierColor, background: checkoutTicket.tierColor + "22" }}
                        >
                          {checkoutTicket.tier}
                        </span>
                        <span className="text-xs" style={{ color: "#6b7280" }}>{checkoutTicket.section} · {checkoutTicket.seat}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs" style={{ color: "#9ca3af" }}>
                      <span>Giá vé</span><span>{fmt(checkoutTicket.price)}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "#9ca3af" }}>
                      <span>Phí bảo vệ giao dịch (5%)</span><span>{fmt(fee)}</span>
                    </div>
                    <div className="flex justify-between font-display font-800 text-white pt-2 text-sm" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <span>Tổng cộng</span><span className="text-purple-300">{fmt(total)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 my-3">
                    <input
                      type="checkbox"
                      id="terms-check-checkout"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-[#13132a] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                    <label htmlFor="terms-check-checkout" className="text-[11px] text-gray-400 leading-relaxed cursor-pointer">
                      Tôi đồng ý với{" "}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                        className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                      >
                        Điều khoản & Chính sách giao dịch
                      </button>{" "}
                      của SafePass.
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
                    <span>🛡️</span>
                    <span>Giao dịch được SafePass Escrow bảo vệ</span>
                  </p>
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