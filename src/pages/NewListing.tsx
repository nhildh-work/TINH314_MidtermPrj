import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { FaceIDVerification } from "../components/FaceIDVerification";
import { PolicyModal } from "../components/PolicyModal";

export default function NewListing() {
  const { nav, dynamicMarketListings, setDynamicMarketListings, setRole, currentUser, currentProfile, setAuthModal, t } = useApp();
  
  const [isFaceScanned, setIsFaceScanned] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  const [step, setStep] = useState(1);

  const [eventName, setEventName] = useState("");
  const [tier, setTier] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [price, setPrice] = useState("");

  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const step1Valid = eventName.trim() && tier.trim() && city.trim() && eventDate.trim();

  const handleSubmit = async () => {
    if (!currentUser) {
      setAuthModal("login");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          seller_id: currentUser.id,
          event_name: eventName.trim(),
          price: Number(price),
          status: "available",
          tier: tier.trim(),
          city: city.trim(),
          venue: venue.trim() || undefined,
          event_date: eventDate.trim(),
          event_image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=400&fit=crop&auto=format",
          section: tier.trim(),
          seat: "—",
        })
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      const newListing = {
        id: data ? Number(data.id) : Date.now(),
        eventId: 0,
        eventTitle: eventName,
        eventImage: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=400&fit=crop&auto=format",
        eventDate: eventDate,
        city,
        tier,
        tierColor: "#A78BFA",
        section: tier,
        seat: "—",
        price: Number(price),
        officialPrice: Number(price),
        sellerName: currentProfile?.full_name || currentUser.email?.split("@")[0] || "Tôi",
        sellerScore: 5.0,
        sellerReviews: 1,
        verified: true,
        minimapUrl: mapFile ? URL.createObjectURL(mapFile) : undefined,
      };
      setDynamicMarketListings([newListing, ...dynamicMarketListings]);
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Đăng bán thất bại");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [t.step1Label, t.step2Label, t.step3Label];

  if (!isFaceScanned) {
      return (
          <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10 relative">
              <div className="absolute inset-0 backdrop-blur-md bg-black/40 z-10 flex items-center justify-center p-4 rounded-xl">
                 <FaceIDVerification onVerified={() => setIsFaceScanned(true)} />
              </div>
              <div className="opacity-30 pointer-events-none">
                  <div className="flex items-center gap-3 mb-6">
                    <button className="sp-btn-ghost text-xs px-3 py-1.5">{t.backBtn}</button>
                    <h1 className="font-display font-800 text-white text-xl">{t.newListingTitle}</h1>
                  </div>
                  <div className="sp-card p-6 h-96 flex items-center justify-center">
                       <p>Nội dung form đã bị khóa...</p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav("seller-dash")} className="sp-btn-ghost text-xs px-3 py-1.5">{t.backBtn}</button>
          <h1 className="font-display font-800 text-white text-xl">{t.newListingTitle}</h1>
        </div>

        <div className="flex gap-0 mb-7">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done_step = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-0 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-700 shrink-0"
                    style={{
                      background: done_step ? "#A3E635" : active ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "#1e1e30",
                      color: done_step ? "#000" : "#fff",
                    }}
                  >
                    {done_step ? "✓" : n}
                  </div>
                  <span className="text-xs font-display font-600 hidden sm:block" style={{ color: active ? "#c4b5fd" : done_step ? "#A3E635" : "#4b5563" }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="w-6 sm:w-10 h-0.5 mx-1.5 shrink-0" style={{ background: done_step ? "#7C3AED" : "#1e1e30" }} />}
              </div>
            );
          })}
        </div>

        {done ? (
          <div className="sp-card p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display font-800 text-white text-xl mb-2">{t.listingSuccess}</h2>
            <p className="text-sm mb-6" style={{ color: "#9ca3af" }}>{t.listingSuccessSub(eventName)}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setRole("buyer"); nav("marketplace"); }} className="sp-btn-primary px-6 py-2.5 font-display font-700">
                {t.viewOnMarket}
              </button>
              <button onClick={() => nav("seller-dash")} className="sp-btn-ghost px-6 py-2.5 font-display font-700">
                {t.manageTickets}
              </button>
            </div>
          </div>
        ) : (
          <div className="sp-card p-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-display font-700 text-white text-base mb-4">{t.step1Label}</h2>

                <div>
                  <p className="sp-filter-label mb-1.5">{t.fieldEventName}</p>
                  <input value={eventName} onChange={e => setEventName(e.target.value)} className="sp-input"
                    placeholder={t.phEventName} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="sp-filter-label mb-1.5">{t.fieldTier}</p>
                    <input value={tier} onChange={e => setTier(e.target.value)} className="sp-input"
                      placeholder={t.phTier} />
                  </div>
                  <div>
                    <p className="sp-filter-label mb-1.5">{t.fieldCity}</p>
                    <input value={city} onChange={e => setCity(e.target.value)} className="sp-input"
                      placeholder={t.phCity} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="sp-filter-label mb-1.5">{t.fieldVenue}</p>
                    <input value={venue} onChange={e => setVenue(e.target.value)} className="sp-input"
                      placeholder={t.phVenue} />
                  </div>
                  <div>
                    <p className="sp-filter-label mb-1.5">{t.fieldDate}</p>
                    <input value={eventDate} onChange={e => setEventDate(e.target.value)} className="sp-input"
                      placeholder={t.phDate} />
                  </div>
                </div>

                <button onClick={() => setStep(2)} disabled={!step1Valid}
                  className="w-full sp-btn-primary py-3 font-display font-700 mt-2">
                  {t.continueBtn}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-display font-700 text-white text-base mb-4">{t.step2Label}</h2>

                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#0a0a14" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(139,92,246,0.15)" }}>
                    🎟️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "#6b7280" }}>{eventName}</p>
                    <p className="font-display font-700 text-sm text-purple-400">{tier} · {city}</p>
                  </div>
                </div>

                <div>
                  <p className="sp-filter-label mb-1.5">{t.fieldSalePrice}</p>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                    className="sp-input text-lg font-display font-700" placeholder={t.phPrice} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 sp-btn-ghost py-3 font-display font-700">{t.backBtn}</button>
                  <button onClick={() => setStep(3)} disabled={!price}
                    className="flex-1 sp-btn-primary py-3 font-display font-700">{t.continueBtn}</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-display font-700 text-white text-base mb-4">{t.step3Label}</h2>

                <div className="p-4 rounded-xl" style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.18)" }}>
                  <p className="text-xs font-700 text-blue-400 mb-1.5">{t.whyHandover}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{t.whyHandoverText}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="sp-filter-label mb-2">{t.uploadTicketLabel}</p>
                    <label className="block cursor-pointer">
                      <div className="h-40 rounded-xl flex flex-col items-center justify-center transition-all"
                        style={{ border: ticketFile ? "2px solid rgba(163,230,53,0.5)" : "2px dashed rgba(139,92,246,0.3)", background: "#0a0a14" }}>
                        {ticketFile ? (
                          <div className="text-center px-3">
                            <p className="text-3xl mb-1.5">✅</p>
                            <p className="text-xs font-display font-700 text-lime-400 line-clamp-2">{ticketFile.name}</p>
                            <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{t.changeFile}</p>
                          </div>
                        ) : (
                          <>
                            <span className="text-3xl mb-2">📎</span>
                            <p className="text-sm font-600 text-white">{t.uploadTicketHint}</p>
                            <p className="text-xs mt-1" style={{ color: "#4b5563" }}>{t.uploadTicketSub}</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.zip" className="hidden"
                        onChange={e => e.target.files?.[0] && setTicketFile(e.target.files[0])} />
                    </label>
                  </div>

                  <div>
                    <p className="sp-filter-label mb-2">{t.uploadMapLabel}</p>
                    <label className="block cursor-pointer">
                      <div className="h-40 rounded-xl flex flex-col items-center justify-center transition-all"
                        style={{ border: mapFile ? "2px solid rgba(34,211,238,0.5)" : "2px dashed rgba(34,211,238,0.2)", background: "#0a0a14" }}>
                        {mapFile ? (
                          <div className="text-center px-3">
                            <p className="text-3xl mb-1.5">🗺️</p>
                            <p className="text-xs font-display font-700 text-cyan-400 line-clamp-2">{mapFile.name}</p>
                            <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{t.changeFile}</p>
                          </div>
                        ) : (
                          <>
                            <span className="text-3xl mb-2">🗺️</span>
                            <p className="text-sm font-600 text-white">{t.uploadMapHint}</p>
                            <p className="text-xs mt-1" style={{ color: "#4b5563" }}>{t.uploadMapSub}</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept=".png,.jpg,.jpeg" className="hidden"
                        onChange={e => e.target.files?.[0] && setMapFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="flex items-start gap-3 my-5">
                  <input 
                    type="checkbox" 
                    id="terms-check-seller"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#13132a] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms-check-seller" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                    Tôi đã đọc và đồng ý với{' '}
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                      className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                    >
                      Điều khoản & Chính sách giao dịch
                    </button>
                    {' '}của nền tảng. Tôi chấp nhận chế tài tịch thu 25% tiền cọc và khóa tài khoản vĩnh viễn nếu vi phạm gian lận.
                  </label>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 sp-btn-ghost py-3 font-display font-700">{t.backBtn}</button>
                  <button
                    onClick={handleSubmit}
                    disabled={!ticketFile || !agreedTerms || loading}
                    className="flex-1 sp-btn-primary py-3 font-display font-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang lưu lên hệ thống..." : t.submitListing}
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