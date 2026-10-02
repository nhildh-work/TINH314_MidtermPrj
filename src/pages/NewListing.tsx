import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { PolicyModal } from "../components/PolicyModal";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

function generateDepositCode() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `SP${digits}`;
}

export default function NewListing() {
  const { nav, dynamicMarketListings, setDynamicMarketListings, setRole, currentUser, currentProfile, setAuthModal, t } = useApp();
  
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  
  const [step, setStep] = useState(1);

  // Form Fields
  const [eventName, setEventName] = useState("");
  const [tier, setTier] = useState("");
  const [city, setCity] = useState("TP.HCM");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [price, setPrice] = useState("");

  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 25% Deposit VietQR State
  const [depositRefCode, setDepositRefCode] = useState<string>("");
  const [copiedDepositCode, setCopiedDepositCode] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  useEffect(() => {
    setDepositRefCode(generateDepositCode());
  }, []);

  const numPrice = Number(price) || 0;
  const depositAmount = Math.round(numPrice * 0.25);
  const payoutOnSale = depositAmount + Math.round(numPrice * 0.95);

  const step1Valid = eventName.trim() && tier.trim() && city.trim() && eventDate.trim();
  const step2Valid = numPrice > 0 && ticketFile !== null;

  const depositQrUrl = depositRefCode && depositAmount > 0
    ? `https://img.vietqr.io/image/mb-04111724267899-compact2.png?amount=${depositAmount}&addInfo=${depositRefCode}&accountName=NGUYEN DINH NGUYEN`
    : "";

  // Handle final deposit confirmation and publish ticket
  const handleConfirmDepositAndPublish = async () => {
    if (!currentUser) {
      setAuthModal("login");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Insert ticket to Supabase
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          seller_id: currentUser.id,
          event_name: eventName.trim(),
          price: numPrice,
          status: "available",
          tier: tier.trim(),
          city: city.trim(),
          venue: venue.trim() || city.trim(),
          event_date: eventDate.trim(),
          event_image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=400&fit=crop&auto=format",
          section: tier.trim(),
          seat: "—",
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert ticket error:", error);
      }

      // 2. Record deposit transaction in Supabase
      if (data?.id) {
        try {
          await supabase.from("transactions").insert({
            ticket_id: data.id,
            buyer_id: currentUser.id,
            amount: depositAmount,
            status: "paid",
            reference_code: depositRefCode,
          });
        } catch (txErr) {
          console.warn("Tx record notice:", txErr);
        }
      }

      // 3. Update dynamic local & broadcast listings
      const newListing = {
        id: data ? Number(data.id) : Date.now(),
        eventId: 0,
        eventTitle: eventName.trim(),
        eventImage: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=400&fit=crop&auto=format",
        eventDate: eventDate.trim(),
        city: city.trim(),
        tier: tier.trim(),
        tierColor: "#A78BFA",
        section: tier.trim(),
        seat: "—",
        price: numPrice,
        officialPrice: numPrice,
        sellerName: currentProfile?.full_name || currentUser.email?.split("@")[0] || "Người bán chính chủ",
        sellerScore: 5.0,
        sellerReviews: 1,
        verified: true,
        minimapUrl: mapFile ? URL.createObjectURL(mapFile) : undefined,
      };

      setDynamicMarketListings([newListing, ...dynamicMarketListings]);
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Đăng bán thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ["1. Thông tin sự kiện", "2. Giá & Tệp vé", "3. Ký quỹ 25% & Niêm yết"];

  return (
    <>
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav("seller-dash")} className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer">
            ← Quay lại Bảng điều khiển
          </button>
          <h1 className="font-display font-800 text-white text-xl">Đăng Bán Vé & Ký Quỹ Bảo Chứng</h1>
        </div>

        {/* Steps Breadcrumb */}
        <div className="flex gap-0 mb-7 overflow-x-auto pb-1">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done_step = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-0 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-700 shrink-0 transition-all"
                    style={{
                      background: done_step ? "#A3E635" : active ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "#1e1e30",
                      color: done_step ? "#000" : "#fff",
                    }}
                  >
                    {done_step ? "✓" : n}
                  </div>
                  <span className="text-xs font-display font-600 hidden sm:block" style={{ color: active ? "#c4b5fd" : done_step ? "#A3E635" : "#64748b" }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="w-8 sm:w-12 h-0.5 mx-2 shrink-0" style={{ background: done_step ? "#7C3AED" : "#1e1e30" }} />}
              </div>
            );
          })}
        </div>

        {done ? (
          <div className="sp-card p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display font-800 text-white text-2xl mb-2">Đăng Vé & Ký Quỹ Thành Công!</h2>
            <p className="text-sm mb-4 max-w-md mx-auto text-gray-300 leading-relaxed">
              Vé sự kiện <strong className="text-purple-300">"{eventName}"</strong> đã được đưa lên hệ thống Chợ Vé SafePass và hiển thị công khai cho mọi người mua.
            </p>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 max-w-md mx-auto text-xs text-purple-200 mb-6 space-y-1 text-left">
              <p>• <strong>Số tiền cọc 25%:</strong> {fmt(depositAmount)} (đang được giữ trong quỹ Escrow).</p>
              <p>• <strong>Khi bán thành công:</strong> Hệ thống tự động hoàn trả <strong className="text-emerald-400">100% tiền cọc + 95% giá trị vé</strong> ({fmt(payoutOnSale)}) vào số dư khả dụng của bạn.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setRole("buyer"); nav("marketplace"); }}
                className="sp-btn-primary px-6 py-2.5 font-display font-700 cursor-pointer"
              >
                Xem trên Chợ Vé
              </button>
              <button
                onClick={() => nav("seller-dash")}
                className="sp-btn-ghost px-6 py-2.5 font-display font-700 cursor-pointer"
              >
                Quản lý vé của tôi
              </button>
            </div>
          </div>
        ) : (
          <div className="sp-card p-6">
            {/* STEP 1: EVENT INFO */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h2 className="font-display font-700 text-white text-base">Bước 1: Thông tin vé sự kiện</h2>
                  <span className="text-xs text-purple-400 font-600">Trực quan & Chính xác</span>
                </div>

                <div>
                  <label className="sp-filter-label mb-1.5 block">Tên sự kiện *</label>
                  <input
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="sp-input"
                    placeholder="Ví dụ: Concert Anh Trai Vượt Ngàn Chông Gai 2026"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="sp-filter-label mb-1.5 block">Hạng vé (Tier) *</label>
                    <input
                      value={tier}
                      onChange={e => setTier(e.target.value)}
                      className="sp-input"
                      placeholder="Ví dụ: VIP 1, GA Đứng, CAT 2..."
                    />
                  </div>
                  <div>
                    <label className="sp-filter-label mb-1.5 block">Khu vực / Thành phố *</label>
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="sp-select"
                    >
                      <option value="TP.HCM">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Khác">Khu vực khác</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="sp-filter-label mb-1.5 block">Địa điểm cụ thể *</label>
                    <input
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      className="sp-input"
                      placeholder="Ví dụ: SVĐ Quốc Gia Mỹ Đình / SVĐ Quân Khu 7"
                    />
                  </div>
                  <div>
                    <label className="sp-filter-label mb-1.5 block">Thời gian diễn ra *</label>
                    <input
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      className="sp-input"
                      placeholder="Ví dụ: 19:30 - 28/11/2026"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="w-full sp-btn-primary py-3.5 font-display font-700 mt-4 cursor-pointer disabled:opacity-40"
                >
                  Tiếp tục: Nhập giá & Tải vé →
                </button>
              </div>
            )}

            {/* STEP 2: PRICE & TICKET FILE */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h2 className="font-display font-700 text-white text-base">Bước 2: Giá niêm yết & Tệp vé</h2>
                  <span className="text-xs text-purple-400 font-600">Quy chế Ký quỹ 25%</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-purple-500/20">
                    🎟️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-700 text-white truncate">{eventName}</p>
                    <p className="text-xs text-purple-300 font-semibold">{tier} · {city} · {eventDate}</p>
                  </div>
                </div>

                <div>
                  <label className="sp-filter-label mb-1.5 block">Giá bán niêm yết cho người mua (VND) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="sp-input text-lg font-display font-700"
                    placeholder="Nhập giá vé (VD: 1000000)"
                  />
                </div>

                {/* 25% Deposit & 95% Payout breakdown */}
                {numPrice > 0 && (
                  <div className="p-4 rounded-xl bg-[#0a0a18] border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Tiền cọc ký quỹ bắt buộc (25%):</span>
                      <span className="font-display font-800 text-amber-400 text-sm">{fmt(depositAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Phí nền tảng SafePass (5% giá vé khi bán):</span>
                      <span className="font-semibold text-gray-300">-{fmt(Math.round(numPrice * 0.05))}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10 text-white">
                      <span className="font-bold text-emerald-400">Tổng tiền bạn nhận về khi bán xong (Cọc + 95% vé):</span>
                      <span className="font-display font-800 text-emerald-400 text-sm">{fmt(payoutOnSale)}</span>
                    </div>
                  </div>
                )}

                {/* Upload Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="sp-filter-label mb-2 block">Tải lên tệp vé gốc (PDF / Ảnh) *</label>
                    <label className="block cursor-pointer">
                      <div
                        className="h-36 rounded-xl flex flex-col items-center justify-center transition-all p-3 text-center"
                        style={{
                          border: ticketFile ? "2px solid rgba(163,230,53,0.5)" : "2px dashed rgba(139,92,246,0.3)",
                          background: "#0a0a14",
                        }}
                      >
                        {ticketFile ? (
                          <>
                            <p className="text-2xl mb-1">✅</p>
                            <p className="text-xs font-display font-700 text-lime-400 line-clamp-2">{ticketFile.name}</p>
                            <p className="text-[11px] mt-1 text-gray-400">Nhấn để đổi file khác</p>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl mb-1.5">📎</span>
                            <p className="text-xs font-700 text-white">Chọn tệp vé của bạn</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Hỗ trợ PDF, PNG, JPG</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.zip"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && setTicketFile(e.target.files[0])}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="sp-filter-label mb-2 block">Sơ đồ vị trí ghế (Tùy chọn)</label>
                    <label className="block cursor-pointer">
                      <div
                        className="h-36 rounded-xl flex flex-col items-center justify-center transition-all p-3 text-center"
                        style={{
                          border: mapFile ? "2px solid rgba(34,211,238,0.5)" : "2px dashed rgba(34,211,238,0.2)",
                          background: "#0a0a14",
                        }}
                      >
                        {mapFile ? (
                          <>
                            <p className="text-2xl mb-1">🗺️</p>
                            <p className="text-xs font-display font-700 text-cyan-400 line-clamp-2">{mapFile.name}</p>
                            <p className="text-[11px] mt-1 text-gray-400">Nhấn để đổi sơ đồ khác</p>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl mb-1.5">🗺️</span>
                            <p className="text-xs font-700 text-white">Chọn ảnh sơ đồ khu vực</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Hỗ trợ PNG, JPG</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && setMapFile(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 sp-btn-ghost py-3.5 font-display font-700 cursor-pointer">
                    ← Quay lại Bước 1
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!step2Valid}
                    className="flex-1 sp-btn-primary py-3.5 font-display font-700 cursor-pointer disabled:opacity-40"
                  >
                    Tiếp tục: Ký quỹ cọc 25% →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: 25% ESCROW DEPOSIT TRANSFER */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h2 className="font-display font-800 text-white text-base">Bước 3: Chuyển khoản Ký Quỹ 25% Giá Trị Vé</h2>
                    <p className="text-xs text-amber-400 font-semibold mt-0.5">Căn cứ Điều 328 Bộ luật Dân sự 2015</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 font-bold">
                    Cọc: {fmt(depositAmount)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                  🛡️ <strong>Cơ chế bảo vệ ký quỹ:</strong> Người bán chuyển khoản cọc 25% giá trị vé để hệ thống bảo chứng và niêm yết lên sàn. Khoản cọc này được SafePass giữ an toàn trong Escrow và sẽ được <strong>hoàn trả 100%</strong> cùng với 95% tiền bán vé ngay khi giao dịch hoàn tất.
                </div>

                {/* QR Code & Banking Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center p-4 rounded-2xl bg-[#080816] border border-white/8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-white p-2.5 rounded-2xl shadow-xl mb-2">
                      {depositQrUrl ? (
                        <img
                          src={depositQrUrl}
                          alt="QR Ký Quỹ SafePass"
                          className="rounded-xl"
                          style={{ width: 190, height: 190 }}
                        />
                      ) : (
                        <div className="w-[190px] h-[190px] flex items-center justify-center text-xs text-gray-500">
                          Đang tạo mã VietQR cọc...
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span>📱</span>
                      <span>Quét QR bằng App Ngân hàng để cọc tự động</span>
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">Ngân hàng:</span>
                      <span className="font-bold text-white">MB Bank (Quân Đội)</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">04111724267899</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("04111724267899");
                            setCopiedAcc(true);
                            setTimeout(() => setCopiedAcc(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-gray-300 hover:text-white"
                        >
                          {copiedAcc ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">Chủ tài khoản:</span>
                      <span className="font-bold text-white uppercase">NGUYEN DINH NGUYEN</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">Số tiền cọc (25%):</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-800 text-amber-400 text-sm">{fmt(depositAmount)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(depositAmount));
                            setCopiedAmount(true);
                            setTimeout(() => setCopiedAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-gray-300 hover:text-white"
                        >
                          {copiedAmount ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-purple-300 font-bold">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-800 text-purple-300 tracking-wider">{depositRefCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(depositRefCode);
                            setCopiedDepositCode(true);
                            setTimeout(() => setCopiedDepositCode(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-purple-500/25 text-[10px] font-bold text-purple-300 hover:text-white"
                        >
                          {copiedDepositCode ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Terms agreement */}
                <div className="flex items-start gap-2.5 my-2">
                  <input
                    type="checkbox"
                    id="terms-check-seller"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-[#13132a] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms-check-seller" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                    Tôi đã đọc và đồng ý với{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                      className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                    >
                      Điều khoản & Chính sách giao dịch
                    </button>
                    {" "}của nền tảng. Tôi hiểu rằng tiền cọc 25% sẽ được hoàn trả 100% cùng 95% tiền vé khi bán thành công.
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="sp-btn-ghost py-3.5 px-5 font-display font-700 cursor-pointer">
                    ← Quay lại
                  </button>
                  <button
                    onClick={handleConfirmDepositAndPublish}
                    disabled={!agreedTerms || loading}
                    className="flex-1 sp-btn-primary py-3.5 font-display font-700 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Đang xác nhận ký quỹ & Niêm yết vé..." : "✓ Xác Nhận Đã Ký Quỹ & Niêm Yết Vé Lên Sàn"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <PolicyModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}
