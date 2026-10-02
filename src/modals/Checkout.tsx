import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { PolicyModal } from "../components/PolicyModal";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

const METHODS = [
  { id: "vietqr", label: "VietQR (Chuyển khoản)", icon: "🏦", desc: "Chuyển khoản ngân hàng qua mã QR" },
  { id: "momo", label: "Ví MoMo", icon: "💜", desc: "Thanh toán qua ví điện tử MoMo" },
  { id: "visa", label: "Visa / Mastercard", icon: "💳", desc: "Thẻ tín dụng / ghi nợ quốc tế" },
  { id: "atm", label: "Thẻ ATM Napas", icon: "🏧", desc: "Thẻ ngân hàng nội địa" },
];

function generateRefCode() {
  return "SP-" + Date.now();
}

export default function CheckoutModal() {
  const { checkoutTicket, closeCheckout, addToCart, currentUser, setAuthModal, addPurchasedTicket, nav } = useApp();
  const [method, setMethod] = useState("vietqr");
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false); // State mở popup điều khoản
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [refCode, setRefCode] = useState<string>("");
  const [qrReady, setQrReady] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [simulating, setSimulating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);

  // Generate ref code once when modal opens
  useEffect(() => {
    setRefCode(generateRefCode());
  }, []);

  // Poll Supabase every 5 seconds to check if SePay webhook confirmed payment
  useEffect(() => {
    if (!qrReady || paymentStatus === "paid" || !refCode) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("transactions")
        .select("status")
        .eq("reference_code", refCode)
        .maybeSingle();

      if (data?.status === "paid") {
        completePurchase();
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [qrReady, paymentStatus, refCode]);

  if (!checkoutTicket) return null;

  const fee = Math.round(checkoutTicket.price * 0.02);
  const total = checkoutTicket.price + fee;

  const qrUrl = `https://img.vietqr.io/image/mb-04111724267899-compact2.png?amount=${total}&addInfo=SafePass ${refCode}&accountName=NGUYEN DINH NGUYEN`;

  const completePurchase = () => {
    setPaymentStatus("paid");
    addToCart();
    addPurchasedTicket({
      id: Date.now(),
      eventTitle: checkoutTicket.eventTitle,
      eventImage: checkoutTicket.eventImage,
      tier: checkoutTicket.tier,
      date: "Sắp diễn ra",
      venue: checkoutTicket.venue || "TP.HCM",
      price: total,
      status: "locked",
    });
    setDone(true);
  };

  const handleShowQR = async () => {
    if (!currentUser) {
      setAuthModal("login");
      return;
    }

    try {
      setLoading(true);

      // Insert transaction record with reference_code so webhook can match
      if (checkoutTicket.id && typeof checkoutTicket.id === "number") {
        await supabase.from("transactions").insert({
          ticket_id: checkoutTicket.id,
          buyer_id: currentUser.id,
          amount: total,
          status: "pending",
          reference_code: refCode,
        });

        // Lock ticket so nobody else can buy
        await supabase
          .from("tickets")
          .update({ status: "locked" })
          .eq("id", checkoutTicket.id);
      }

      setQrReady(true);
    } catch (err) {
      console.error("Lỗi khi tạo transaction:", err);
      // Still show QR even if DB write fails
      setQrReady(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualConfirm = () => {
    completePurchase();
  };

  const handleSimulateWebhook = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      completePurchase();
    }, 1800);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
        onClick={closeCheckout}
      >
        <div
          className="sp-card w-full max-w-2xl overflow-y-auto"
          style={{ maxHeight: "92vh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <h2 className="font-display font-800 text-white text-lg">Thanh toán an toàn</h2>
            </div>
            <button onClick={closeCheckout} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
          </div>

          {done ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="font-display font-800 text-white text-xl mb-2">Đặt vé thành công!</h3>
              <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>
                Vé của bạn đang được SafePass giữ an toàn trong Escrow. Xem trong mục Vé của tôi.
              </p>
              <button
                onClick={() => {
                  closeCheckout();
                  nav("my-tickets");
                }}
                className="sp-btn-primary px-6 py-2.5 font-display font-700"
              >
                Xem vé của tôi
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* Payment methods */}
              <div className="flex-1 p-6" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="sp-filter-label mb-3">Phương thức thanh toán</p>
                <div className="space-y-2">
                  {METHODS.map(m => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: method === m.id ? "rgba(139,92,246,0.12)" : "#0a0a18",
                        border: method === m.id ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <input
                        type="radio"
                        name="pay"
                        value={m.id}
                        checked={method === m.id}
                        onChange={() => { setMethod(m.id); setQrReady(false); }}
                        style={{ accentColor: "#7C3AED" }}
                      />
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-sm font-600 text-white">{m.label}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* VietQR section */}
                {method === "vietqr" && (
                  <div className="mt-4">
                    {!qrReady ? (
                      <div
                        className="rounded-xl p-4 text-center"
                        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
                      >
                        <p className="text-xs mb-3" style={{ color: "#9ca3af" }}>
                          Bấm xác nhận để tạo mã VietQR SePay tự động khớp giao dịch
                        </p>
                        <button
                          onClick={handleShowQR}
                          disabled={!agreed || loading}
                          className="w-full py-2.5 rounded-xl font-display font-700 text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer"
                          style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
                        >
                          {loading ? "Đang tạo mã QR..." : "📲 Hiện mã QR thanh toán SePay"}
                        </button>
                      </div>
                    ) : (
                      <div
                        className="rounded-xl p-4"
                        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
                      >
                        <p className="text-xs font-700 text-center mb-2" style={{ color: "#10B981" }}>
                          📷 Quét mã QR bằng App Ngân hàng hoặc MoMo
                        </p>
                        <div className="flex justify-center mb-3">
                          <img
                            src={qrUrl}
                            alt="QR chuyển khoản MBBank SePay"
                            className="rounded-xl shadow-lg"
                            style={{ width: 190, height: 190, border: "2px solid rgba(16,185,129,0.3)" }}
                          />
                        </div>

                        {/* Bank Details */}
                        <div className="rounded-xl p-3 bg-black/40 border border-white/5 space-y-2 mb-3 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Ngân hàng:</span>
                            <span className="font-600 text-white">MB Bank (Quân Đội)</span>
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
                                className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-gray-300 hover:text-white"
                              >
                                {copiedAcc ? "✓" : "Copy"}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Chủ tài khoản:</span>
                            <span className="font-600 text-white">NGUYEN DINH NGUYEN</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-white/5">
                            <span className="text-purple-300 font-600">Nội dung CK:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-700 text-purple-300">{`SafePass ${refCode}`}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`SafePass ${refCode}`);
                                  setCopiedCode(true);
                                  setTimeout(() => setCopiedCode(false), 2000);
                                }}
                                className="px-1.5 py-0.5 rounded bg-purple-500/20 text-[10px] text-purple-300 hover:text-white"
                              >
                                {copiedCode ? "✓" : "Copy"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 my-2">
                          <div
                            className="w-2 h-2 rounded-full animate-ping"
                            style={{ background: "#F59E0B" }}
                          />
                          <p className="text-xs" style={{ color: "#F59E0B" }}>
                            Đang chờ SePay Webhook xác nhận biến động số dư...
                          </p>
                        </div>

                        {/* Simulation & Manual actions */}
                        <div className="space-y-1.5 mt-3">
                          <button
                            type="button"
                            onClick={handleSimulateWebhook}
                            disabled={simulating}
                            className="w-full py-2 rounded-xl text-xs font-700 transition-all cursor-pointer bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5"
                          >
                            {simulating ? "🔄 Đang nhận diện biến động số dư SePay..." : "⚡ Giả lập SePay đã nhận tiền (Test nhanh)"}
                          </button>

                          <button
                            type="button"
                            onClick={handleManualConfirm}
                            className="w-full py-1.5 rounded-xl text-xs font-600 transition-all hover:opacity-80 bg-white/5 text-gray-400 border border-white/10"
                          >
                            Tôi đã chuyển khoản xong (Xác nhận thủ công)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Other methods placeholder */}
                {method !== "vietqr" && (
                  <div
                    className="mt-4 rounded-xl p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      Phương thức này đang được phát triển. Vui lòng chọn VietQR.
                    </p>
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="w-full md:w-72 p-6 shrink-0">
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

                {checkoutTicket.minimapUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="px-3 py-2 flex items-center gap-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(96,165,250,0.06)" }}>
                      <span className="text-xs">🗺️</span>
                      <p className="text-xs font-display font-700" style={{ color: "#93C5FD" }}>Sơ đồ khu vực ghế</p>
                    </div>
                    <img src={checkoutTicket.minimapUrl} alt="Sơ đồ" className="w-full object-contain" style={{ maxHeight: "140px", background: "#0a0a14" }} />
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs" style={{ color: "#9ca3af" }}>
                    <span>Giá vé</span><span>{fmt(checkoutTicket.price)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: "#9ca3af" }}>
                    <span>Phí dịch vụ (2%)</span><span>{fmt(fee)}</span>
                  </div>
                  <div className="flex justify-between font-display font-800 text-white pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span>Tổng cộng</span><span>{fmt(total)}</span>
                  </div>
                </div>

                {/* Checkbox điều khoản tích hợp PolicyModal */}
                <div className="flex items-start gap-3 my-4">
                  <input
                    type="checkbox"
                    id="terms-check-checkout"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#13132a] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms-check-checkout" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
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

                {/* Pay button only for non-VietQR methods */}
                {method !== "vietqr" && (
                  <button
                    onClick={handleShowQR}
                    disabled={!agreed || loading}
                    className="w-full py-3.5 rounded-xl font-display font-700 text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#065F46,#059669)", boxShadow: "0 4px 20px rgba(5,150,105,0.25)" }}
                  >
                    {loading ? "Đang xử lý giao dịch..." : `🔒 Thanh Toán An Toàn · ${fmt(total)}`}
                  </button>
                )}
                <p className="text-center text-xs mt-2" style={{ color: "#374151" }}>🛡️ Giao dịch được SafePass bảo vệ</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gọi Modal điều khoản */}
      <PolicyModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}