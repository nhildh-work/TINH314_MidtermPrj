import { useState, useEffect } from "react";
import { useApp } from "../context";
import { MY_TICKETS, type MyTicket } from "../data";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

const STATUS_CFG = {
  locked: { label: "LOCKED", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  available: { label: "AVAILABLE", color: "#A3E635", bg: "rgba(163,230,53,0.1)" },
  completed: { label: "COMPLETED", color: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  dispute: { label: "DISPUTE", color: "#F87171", bg: "rgba(248,113,113,0.1)" },
} as const;

function QRPlaceholder({ blurred }: { blurred: boolean }) {
  const cells = Array.from({ length: 25 }, (_, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const isCorner = (row < 2 && col < 2) || (row < 2 && col > 2) || (row > 2 && col < 2);
    const filled = isCorner || Math.random() > 0.45;
    return filled;
  });

  return (
    <div
      className="relative w-20 h-20 rounded-xl p-2 flex-shrink-0"
      style={{ background: "#fff", filter: blurred ? "blur(5px)" : "none" }}
    >
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {cells.map((filled, i) => (
          <div key={i} className="rounded-sm" style={{ aspectRatio: "1", background: filled ? "#111" : "transparent" }} />
        ))}
      </div>
    </div>
  );
}

export default function MyTickets() {
  const { openDispute, nav, isLoggedIn, setAuthModal, reportedTicketIds, addReportedTicket, currentUser, t, purchasedTickets: contextPurchasedTickets } = useApp();
  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set<number>());
  const [purchasedTickets, setPurchasedTickets] = useState<MyTicket[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    async function loadMyTransactions() {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select(`
            id,
            status,
            amount,
            tickets:ticket_id (
              id,
              event_name,
              event_image,
              tier,
              venue,
              city,
              event_date,
              price
            )
          `)
          .eq("buyer_id", currentUser.id);

        if (!error && data && data.length > 0) {
          const mapped: MyTicket[] = data
            .filter((t: any) => t.tickets)
            .map((t: any) => ({
              id: Number(t.tickets.id),
              eventTitle: t.tickets.event_name,
              eventImage: t.tickets.event_image || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
              tier: t.tickets.tier || "Standard",
              date: t.tickets.event_date || "Sắp diễn ra",
              venue: t.tickets.venue || t.tickets.city || "TP.HCM",
              price: Number(t.amount || t.tickets.price),
              status: t.status === "paid" ? "locked" : t.status === "completed" ? "completed" : t.status === "disputed" ? "dispute" : "locked",
            }));
          setPurchasedTickets(mapped);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách vé từ Supabase:", err);
      }
    }

    loadMyTransactions();
  }, [currentUser]);

  // Chỉ lấy vé người dùng hiện tại thực sự đã mua (qua Supabase hoặc trong phiên làm việc)
  const allTickets = [...contextPurchasedTickets, ...purchasedTickets];

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-4xl mb-3">🎟️</p>
        <p className="font-display font-700 text-white text-lg mb-2">{t.loginToSeeTickets}</p>
        <button onClick={() => setAuthModal("login")} className="sp-btn-primary px-6 py-2.5 mt-3">{t.login}</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav("marketplace")} className="sp-btn-ghost text-xs px-3 py-1.5 font-display font-700 shrink-0">
          {t.backToMarket}
        </button>
        <h1 className="font-display font-800 text-white text-2xl flex-1">{t.myTickets}</h1>
        <button
          onClick={() => nav("dispute-center")}
          className="sp-btn-ghost text-xs px-3 py-2 font-display font-700 shrink-0"
          style={{ borderColor: "rgba(248,113,113,0.25)", color: "#F87171" }}
        >
          {t.disputeBtn}
        </button>
      </div>

      {allTickets.length === 0 ? (
        <div className="sp-card p-12 text-center">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="font-display font-700 text-white mb-1">{t.noTicketsYet}</p>
          <button onClick={() => nav("marketplace")} className="sp-btn-primary mt-4 px-6 py-2.5">{t.goShop}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {allTickets.map(ticket => {
            const effectiveStatus = checkedIn.has(ticket.id) ? "completed" : reportedTicketIds.includes(ticket.id) ? "dispute" : ticket.status;
            const cfg = STATUS_CFG[effectiveStatus];
            const isLocked = effectiveStatus === "locked";

            return (
              <div key={ticket.id} className="sp-card overflow-hidden">
                {/* Top image strip */}
                <div className="relative h-28 overflow-hidden">
                  <img src={ticket.eventImage} alt={ticket.eventTitle} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(13,13,30,0.95) 0%, rgba(13,13,30,0.4) 60%, transparent 100%)" }} />
                  <div className="absolute inset-0 flex items-center px-4 gap-4">
                    {/* QR */}
                    <div className="relative shrink-0">
                      <QRPlaceholder blurred={isLocked} />
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <span className="text-2xl">🔒</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-700 text-white text-sm leading-snug mb-1 line-clamp-2">{ticket.eventTitle}</h3>
                      <span
                        className="text-xs font-display font-700 px-2 py-0.5 rounded-full"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { icon: "🎫", label: t.tierLabel2, val: ticket.tier },
                      { icon: "💰", label: t.pricePaid, val: fmt(ticket.price) },
                      { icon: "📅", label: t.timeLabel, val: ticket.date },
                      { icon: "📍", label: t.venueLabel, val: ticket.venue },
                    ].map(item => (
                      <div key={item.label} className="flex gap-2 items-start">
                        <span className="text-sm mt-0.5 shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <p className="sp-filter-label">{item.label}</p>
                          <p className="text-xs font-500 text-white mt-0.5 truncate">{item.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions for LOCKED tickets */}
                  {isLocked && effectiveStatus !== "dispute" && (
                    <div className="space-y-2">
                      <p className="text-xs text-center pb-2" style={{ color: "#6b7280" }}>{t.checkinHint}</p>
                      <button
                        onClick={() => setCheckedIn(prev => new Set([...prev, ticket.id]))}
                        className="w-full py-3 rounded-xl font-display font-700 text-sm text-white transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg,#065F46,#059669)" }}
                      >
                        {t.checkinBtn}
                      </button>
                      <button
                        onClick={() => { addReportedTicket(ticket.id); openDispute(ticket); }}
                        className="w-full py-2.5 rounded-xl font-display font-700 text-sm transition-all"
                        style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.25)", background: "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.07)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {t.reportBtn}
                      </button>
                    </div>
                  )}

                  {effectiveStatus === "dispute" && (
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
                      <p className="text-xs font-display font-700" style={{ color: "#F87171" }}>{t.reportedStatus}</p>
                    </div>
                  )}

                  {effectiveStatus === "completed" && (
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.14)" }}>
                      <p className="text-xs" style={{ color: "#60A5FA" }}>{t.completedMsg}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
