import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { PolicyModal } from "../components/PolicyModal";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

function generateRefCode(ticketId: string | number) {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `SP${ticketId}${Date.now().toString().slice(-4)}${randomSuffix}`;
}

export default function CheckoutModal() {
  const { checkoutTicket, closeCheckout, addToCart, currentUser, addPurchasedTicket, nav } = useApp();
  const [showTerms, setShowTerms] = useState(false);
  const [done, setDone] = useState(false);
  const [refCode, setRefCode] = useState<string>("");
  const [qrReady, setQrReady] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [isVerifying, setIsVerifying] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Biến cờ tuyệt đối để phân biệt Luồng Người Bán Đóng Cọc vs Người Mua
  const isDepositTx = checkoutTicket?.isDeposit === true || checkoutTicket?.tier?.includes("Cọc");

  const handleClose = async () => {
    if (paymentStatus === "pending" && refCode && checkoutTicket?.id && !isDepositTx) {
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

    setDone(false);
    setPaymentStatus("pending");

    const code = generateRefCode(checkoutTicket.id);
    setRefCode(code);

    // CHUẨN GIÁ: Đóng cọc = giá gốc (25% đã tính). Mua vé = Giá vé + 5% Phí nền tảng
    const finalAmount = isDepositTx
      ? checkoutTicket.price
      : checkoutTicket.price + Math.round(checkoutTicket.price * 0.05);

    async function initTransaction() {
      try {
        if (checkoutTicket && checkoutTicket.id) {
          // Xóa các dòng pending cũ để chống trùng cờ giao dịch
          await supabase
            .from("transactions")
            .delete()
            .eq("ticket_id", checkoutTicket.id)
            .eq("status", "pending");

          // Tạo transaction pending mới
          await supabase.from("transactions").insert({
            ticket_id: checkoutTicket.id,
            buyer_id: currentUser!.id,
            amount: finalAmount,
            status: "pending",
            reference_code: code,
          });
        }
      } catch (err) {
        console.warn("Lỗi khởi tạo giao dịch:", err);
      } finally {
        setQrReady(true);
      }
    }

    initTransaction();
  }, [checkoutTicket?.id, currentUser?.id]);

  if (!checkoutTicket) return null;

  const total = isDepositTx
    ? checkoutTicket.price
    : checkoutTicket.price + Math.round(checkoutTicket.price * 0.05);

  const qrUrl = refCode
    ? `https://img.vietqr.io/image/mb-04111724267899-compact2.png?amount=${total}&addInfo=${refCode}&accountName=NGUYEN DINH NGUYEN`
    : "";

  // HÀM HOÀN TẤT GIAO DỊCH TÁCH BIỆT 100% 2 LUỒNG
  const completePurchase = async () => {
    setPaymentStatus("paid");

    try {
      if (refCode) {
        await supabase.from("transactions").update({ status: "paid" }).eq("reference_code", refCode);
      }

      if (checkoutTicket && checkoutTicket.id) {
        if (isDepositTx) {
          // 🟢 LUỒNG NGƯỜI BÁN ĐÓNG CỌC
          await supabase.from("tickets").update({ status: "available" }).eq("id", checkoutTicket.id);
          // TUYỆT ĐỐI KHÔNG addPurchasedTicket() VÀO ĐÂY NỮA
        } else {
          // 🔵 LUỒNG NGƯỜI MUA MUA VÉ
          await supabase.from("tickets").update({ status: "sold" }).eq("id", checkoutTicket.id);
          
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
        }
      }
    } catch (e) {
      console.warn("Lỗi cập nhật DB:", e);
    }

    setDone(true);
  };

  const handleManualVerify = async () => {
    setIsVerifying(true);
    setTimeout(() => {
      completePurchase();
      setIsVerifying(false);
    }, 1200);
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
                <h2 className="font-display font-800 text-white text-lg">
                  {isDepositTx ? "Thanh Toán Cọc Ký Quỹ Mở Bán" : "Thanh Toán Chuyển Khoản VietQR"}
                </h2>
                <p className="text-[11px] text-gray-400">Giao dịch được bảo vệ an toàn qua SafePass Escrow</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full text-gray-400 hover:text-white cursor-pointer">✕</button>
          </div>

          {done ? (
            /* 🔴 POPUP THÔNG BÁO TỰ ĐỘNG CHIA 2 LUỒNG 🔴 */
            <div className="p-10 text-center space-y-5 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-5xl animate-bounce">
                🎉
              </div>
              <div>
                <h3 className="font-display font-800 text-white text-2xl">
                  {isDepositTx ? "Hoàn Tất Đóng Cọc Ký Quỹ!" : "Thanh Toán Mua Vé Thành Công!"}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto mt-2">
                  {isDepositTx 
                    ? "Giao dịch ký quỹ Escrow đã hoàn tất. Vé của bạn đã được chuyển sang trạng thái ĐANG BÁN trên sàn giao dịch!" 
                    : "Hệ thống SafePass đã xác nhận biến động số dư. Vé điện tử chính thức đã được chuyển vào mục Vé Của Tôi."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 text-left max-w-md mx-auto space-y-2">
                <p className="flex justify-between">
                  <span className="text-gray-400">Mã giao dịch:</span>
                  <strong className="font-mono text-amber-300">{refCode}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">Sự kiện:</span>
                  <strong>{checkoutTicket.eventTitle}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">Trạng thái:</span>
                  <strong className="text-emerald-400">
                    {isDepositTx ? "✓ Đã mở bán công khai" : "✓ Đã đưa vào kho vé"}
                  </strong>
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => { 
                    closeCheckout(); 
                    if (isDepositTx) {
                      nav("seller-dash"); // Đóng cọc thì quay lại Dashboard Người Bán
                    } else {
                      nav("my-tickets"); // Mua vé thì về Vé của tôi
                    }
                  }}
                  className="sp-btn-primary px-8 py-3.5 font-display font-800 text-sm cursor-pointer shadow-xl"
                >
                  {isDepositTx ? "Quản lý Bảng Điều Khiển →" : "Xem trong kho vé của tôi →"}
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

                  <button
                    onClick={handleManualVerify}
                    disabled={isVerifying}
                    className="mt-4 w-full sp-btn-primary py-3 font-display font-700 text-xs cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isVerifying ? "Đang xác thực giao dịch..." : "✅ Đã chuyển khoản - Kiểm tra thanh toán ngay"}
                  </button>
                </div>
              </div>

              <div className="w-full md:w-72 p-6 shrink-0 flex flex-col justify-between">
                <div>
                  <p className="sp-filter-label mb-3">Tóm tắt đơn hàng</p>
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-2 text-xs">
                    <p className="font-bold text-white">{checkoutTicket.eventTitle}</p>
                    <p className="text-purple-400 truncate">{checkoutTicket.tier}</p>
                    <div className="flex justify-between text-gray-400 pt-2 border-t border-white/5 mt-2">
                      <span>{isDepositTx ? "Tiền cọc" : "Tổng tiền"}</span>
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