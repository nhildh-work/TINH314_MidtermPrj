import { useState, useEffect } from "react";
import { useApp } from "../context";
import { MY_LISTINGS, type MyListing } from "../data";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

const STATUS_CFG = {
  available: { label: "AVAILABLE", color: "#A3E635", bg: "rgba(163,230,53,0.1)" },
  locked:    { label: "LOCKED",    color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  completed: { label: "COMPLETED", color: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
} as const;

const PENDING = MY_LISTINGS.reduce((s, l) => s + (l.status !== "completed" ? l.price : 0), 0);
const FEE_RATE = 0.015;

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  const fee = Math.round(PENDING * FEE_RATE);
  const net = PENDING - fee;
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="sp-card p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="font-display font-800 text-white text-lg mb-1">{t.withdrawSent}</h2>
        <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>{t.withdrawSentSub(fmt(net))}</p>
        <button onClick={onClose} className="sp-btn-primary w-full py-3 font-display font-700">{t.closeBtn}</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="sp-card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-800 text-white text-lg mb-1">{t.withdrawTitle}</h2>
        <p className="text-xs mb-5" style={{ color: "#6b7280" }}>{t.withdrawSub}</p>

        <div className="rounded-xl p-4 mb-4 space-y-2.5" style={{ background: "#0a0a14" }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#9ca3af" }}>{t.balance}</span>
            <span className="font-display font-700 text-white">{fmt(PENDING)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#9ca3af" }}>{t.earlyFee}</span>
            <span className="font-display font-700" style={{ color: "#F87171" }}>-{fmt(fee)}</span>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem" }} className="flex justify-between">
            <span className="font-display font-700 text-white text-sm">{t.netReceive}</span>
            <span className="font-display font-800 text-white text-base">{fmt(net)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl mb-5" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
          <span className="text-sm shrink-0">⚠️</span>
          <p className="text-xs leading-relaxed" style={{ color: "#d1a927" }}>
            {t.waitWarning(fmt(PENDING))}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 sp-btn-ghost py-3 font-display font-700">{t.cancelBtn}</button>
          <button onClick={() => setConfirmed(true)} className="flex-1 sp-btn-primary py-3 font-display font-700 text-sm">
            {t.confirmWithdraw(fmt(net))}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ listing, onClose }: { listing: MyListing; onClose: () => void }) {
  const { t } = useApp();
  const cfg = STATUS_CFG[listing.status];
  const [cancelled, setCancelled] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="sp-card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display font-700 text-white text-sm leading-snug pr-4">{listing.eventTitle}</h2>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: t.colTier, val: listing.tier, accent: "#A78BFA" },
            { label: t.colDate, val: listing.date, accent: undefined },
            { label: t.colPrice, val: fmt(listing.price), accent: "#fff" },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center">
              <span className="sp-filter-label">{r.label}</span>
              <span className="font-display font-700 text-sm" style={{ color: r.accent ?? "#9ca3af" }}>{r.val}</span>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">{t.colStatus}</span>
            <span className="text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {cancelled ? (
          <div className="text-center py-3">
            <p className="text-sm font-display font-700 text-lime-400">{t.cancelledListing}</p>
          </div>
        ) : listing.status === "available" ? (
          <button
            onClick={() => setCancelled(true)}
            className="w-full py-3 rounded-xl font-display font-700 text-sm transition-all"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#F87171" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
          >
            {t.cancelListing}
          </button>
        ) : (
          <p className="text-xs text-center" style={{ color: "#4b5563" }}>
            {listing.status === "locked" ? t.lockedNoCancel : t.completedNoCancel}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SellerDash() {
  const { nav, kycStatus, setKycStatus, currentUser, dynamicMarketListings, t } = useApp();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [detailListing, setDetailListing] = useState<MyListing | null>(null);
  const [sellerTickets, setSellerTickets] = useState<MyListing[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    async function loadSellerTickets() {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("seller_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: MyListing[] = data.map((t: any) => ({
            id: Number(t.id),
            eventTitle: t.event_name,
            tier: t.tier || "Standard",
            price: Number(t.price),
            status: t.status === "sold" ? "completed" : t.status === "locked" ? "locked" : "available",
            date: t.event_date || "Sắp diễn ra",
          }));
          setSellerTickets(mapped);
        }
      } catch (err) {
        console.error("Lỗi khi tải vé người bán từ Supabase:", err);
      }
    }

    loadSellerTickets();
  }, [currentUser]);

  const allSellerListings = [...sellerTickets, ...MY_LISTINGS];

  if (kycStatus !== "approved") {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl"
          style={{ background: "rgba(139,92,246,0.1)", border: "2px solid rgba(139,92,246,0.2)" }}>
          🔐
        </div>
        <h2 className="font-display font-800 text-white text-2xl mb-2">{t.kycRequired}</h2>
        <p className="text-sm mb-2 max-w-xs mx-auto leading-relaxed" style={{ color: "#9ca3af" }}>{t.kycSub}</p>
        <p className="text-xs mb-6" style={{ color: "#4b5563" }}>{t.kycNote}</p>
        <button onClick={() => nav("kyc")} className="sp-btn-primary px-8 py-3 font-display font-700">
          {t.kycStart}
        </button>
        <div className="sp-testmode max-w-xs mx-auto">
          <p className="text-xs mb-2" style={{ color: "#4b5563", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600 }}>🧪 Chế độ test</p>
          <button className="sp-testmode-btn" onClick={() => setKycStatus("approved")}>
            Giả sử đã xác minh → mở khóa trang bán vé
          </button>
        </div>
      </div>
    );
  }

  const activeCount = allSellerListings.filter(l => l.status === "available").length;
  const currentPending = allSellerListings.reduce((s, l) => s + (l.status !== "completed" ? l.price : 0), 0);

  const STATS = [
    { label: t.totalListings,  value: String(allSellerListings.length), icon: "🎟️", color: "#8B5CF6" },
    { label: t.activeSelling,  value: String(activeCount),         icon: "🟢", color: "#A3E635" },
    { label: t.pendingPayout,  value: fmt(currentPending),         icon: "💰", color: "#FBBF24" },
  ];

  return (
    <div className="max-w-[1680px] mx-auto px-5 lg:px-8 py-8">
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} />}
      {detailListing && <DetailModal listing={detailListing} onClose={() => setDetailListing(null)} />}

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display font-800 text-white text-2xl">{t.sellerDashTitle}</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{t.sellerDashSub}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => nav("dispute-center")} className="sp-btn-ghost px-4 py-2.5 font-display font-700 text-sm"
            style={{ borderColor: "rgba(248,113,113,0.25)", color: "#F87171" }}>
            {t.disputeBtn}
          </button>
          <button onClick={() => nav("new-listing")} className="sp-btn-primary px-5 py-2.5 font-display font-700">
            {t.listNew}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {STATS.map(s => (
          <div key={s.label} className="sp-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: s.color + "1a" }}>
                {s.icon}
              </div>
              <p className="text-xs" style={{ color: "#6b7280" }}>{s.label}</p>
            </div>
            <p className="font-display font-800 text-white text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 p-3.5 rounded-xl flex items-center gap-3" style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.14)" }}>
        <span className="text-xl">📅</span>
        <p className="text-sm flex-1" style={{ color: "#9ca3af" }}
          dangerouslySetInnerHTML={{ __html: t.payoutBanner('<strong style="color:#60A5FA">Friday</strong>', '<strong style="color:#FBBF24">1.5%</strong>') }} />
        <button onClick={() => setShowWithdraw(true)} className="sp-btn-ghost text-xs px-4 py-2 font-display font-700 shrink-0">
          {t.withdrawNow}
        </button>
      </div>

      <div className="sp-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="font-display font-700 text-white text-sm">{t.listingTable}</h2>
          <span className="text-xs font-display font-600" style={{ color: "#6b7280" }}>{allSellerListings.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", display: "table-row" }}>
                {([t.colEvent, t.colTier, t.colPrice, t.colDate, t.colStatus, ""] as const).map(h => (
                  <th key={h} className="sp-filter-label" style={{ textAlign: "left", padding: "12px 20px", display: "table-cell" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSellerListings.map(listing => {
                const cfg = STATUS_CFG[listing.status];
                return (
                  <tr key={listing.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", display: "table-row" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-600 text-white line-clamp-1">{listing.eventTitle}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-display font-700 text-purple-400">{listing.tier}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-display font-700 text-white text-sm">{fmt(listing.price)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: "#9ca3af" }}>{listing.date}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setDetailListing(listing)}
                        className="text-xs font-display font-600 transition-colors"
                        style={{ color: "#6b7280" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#A78BFA")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
                      >
                        {t.colDetail}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
