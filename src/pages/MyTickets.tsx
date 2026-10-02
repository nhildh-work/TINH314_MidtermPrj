import { useState, useEffect } from "react";
import { useApp } from "../context";
import type { MyTicket } from "../data";
import { supabase } from "../lib/supabaseClient";
import TicketPassModal from "../modals/TicketPassModal";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

const STATUS_CFG = {
  locked: { label: "🎟️ SẴN SÀNG QUÉT CỔNG", color: "#A78BFA", bg: "rgba(167,139,250,0.14)" },
  paid: { label: "🎟️ SẴN SÀNG QUÉT CỔNG", color: "#A78BFA", bg: "rgba(167,139,250,0.14)" },
  available: { label: "🟢 HỢP LỆ", color: "#A3E635", bg: "rgba(163,230,53,0.14)" },
  completed: { label: "✅ ĐÃ VÀO CỔNG", color: "#34D399", bg: "rgba(52,211,153,0.14)" },
  dispute: { label: "🚨 TRANH CHẤP CỔNG", color: "#F87171", bg: "rgba(248,113,113,0.14)" },
} as const;

function MiniQR({ ticketId, onOpen }: { ticketId: number; onOpen: () => void }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=SAFEPASS-GATE-${ticketId}`;
  return (
    <div
      onClick={onOpen}
      title="Bấm để mở vé quét mã to toàn màn hình"
      className="relative w-16 h-16 rounded-xl p-1 bg-white flex-shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-md group flex items-center justify-center overflow-hidden"
    >
      <img src={qrUrl} alt="Mini QR" className="w-full h-full object-contain" />
      <div className="absolute inset-0 bg-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
        <span className="text-white text-[10px] font-display font-800">MỞ QR</span>
      </div>
    </div>
  );
}

export default function MyTickets() {
  const {
    openDispute,
    nav,
    isLoggedIn,
    setAuthModal,
    reportedTicketIds,
    addReportedTicket,
    currentUser,
    currentProfile,
    t,
    purchasedTickets: contextPurchasedTickets,
  } = useApp();

  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set<number>());
  const [purchasedTickets, setPurchasedTickets] = useState<MyTicket[]>([]);
  const [selectedTicketForPass, setSelectedTicketForPass] = useState<MyTicket | null>(null);

  useEffect(() => {
    const uid = currentUser?.id || currentProfile?.id;
    if (!uid) return;

    // Tự động dọn sạch các vé cọc người bán lưu sót lại trong localStorage cũ
    try {
      const stored = localStorage.getItem("safepass_purchased_tickets");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((t: any) => !t.isDeposit && !t.tier?.includes("Cọc") && t.id !== 12);
          localStorage.setItem("safepass_purchased_tickets", JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.warn("Lỗi kiểm tra vé lưu cục bộ:", e);
    }

    async function loadMyTransactions() {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select(`
            id,
            status,
            amount,
            reference_code,
            tickets:ticket_id (
              id,
              seller_id,
              event_name,
              event_image,
              tier,
              venue,
              city,
              event_date,
              price,
              status
            )
          `)
          .eq("buyer_id", uid);

        if (!error && data) {
          const mapped: MyTicket[] = data
            .filter((t: any) => {
              if (!t.tickets) return false;
              // 1. Tuyệt đối KHÔNG hiện vé do chính người dùng đăng bán (người bán nộp cọc không phải là mua vé)
              if (t.tickets.seller_id === uid) return false;
              // 2. Tuyệt đối KHÔNG hiện vé chưa có người mua (vẫn đang mở bán hoặc chờ đóng cọc trên sàn)
              if (t.tickets.status === "available" || t.tickets.status === "pending_deposit") return false;
              // 3. Chỉ hiện giao dịch mua vé đã thành công
              return t.status === "paid" || t.status === "completed" || t.status === "disputed";
            })
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
        } else {
          setPurchasedTickets([]);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách vé từ Supabase:", err);
        setPurchasedTickets([]);
      }
    }

    loadMyTransactions();
  }, [currentUser?.id, currentProfile?.id]);

  // Kết hợp vé từ Supabase và vé từ Local Context an toàn không mất vé
  const combinedTickets = [...purchasedTickets, ...(contextPurchasedTickets || [])];
  const seenIds = new Set<number>();
  const allTickets = combinedTickets.filter(t => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  const buyerName = currentProfile?.full_name || (currentUser?.user_metadata as any)?.full_name || currentUser?.email || "Khách hàng SafePass";
  const buyerEmail = currentProfile?.email || currentUser?.email || "";

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
        <h1 className="font-display font-800 text-white text-2xl flex-1">Giỏ Hàng / Vé Của Tôi</h1>
        <button
          onClick={() => nav("dispute-center")}
          className="sp-btn-ghost text-xs px-3 py-2 font-display font-700 shrink-0 flex items-center gap-1.5"
          style={{ borderColor: "rgba(248,113,113,0.3)", color: "#F87171" }}
        >
          <span>🚨</span>
          <span>Trung tâm tranh chấp</span>
        </button>
      </div>

      {allTickets.length === 0 ? (
        <div className="sp-card p-12 text-center space-y-3">
          <p className="text-4xl">🛍️</p>
          <h2 className="font-display font-800 text-white text-lg">Giỏ hàng đang trống</h2>
          <p className="text-xs text-gray-400">Bạn chưa mua vé nào trên sàn SafePass.</p>
          <button onClick={() => nav("marketplace")} className="sp-btn-primary mt-3 px-6 py-2.5 font-display font-700 text-xs">
            Khám phá chợ vé →
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {allTickets.map(ticket => {
            const effectiveStatus = checkedIn.has(ticket.id) ? "completed" : reportedTicketIds.includes(ticket.id) ? "dispute" : ticket.status;
            const cfg = STATUS_CFG[effectiveStatus] || STATUS_CFG.locked;
            const isLocked = effectiveStatus === "locked";

            return (
              <div key={ticket.id} className="sp-card overflow-hidden transition-all duration-200 hover:border-purple-500/30">
                <div className="relative h-32 overflow-hidden">
                  <img src={ticket.eventImage} alt={ticket.eventTitle} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(13,13,30,0.96) 0%, rgba(13,13,30,0.6) 65%, transparent 100%)" }} />
                  <div className="absolute inset-0 flex items-center px-4 gap-4">
                    <MiniQR ticketId={ticket.id} onOpen={() => setSelectedTicketForPass(ticket)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-display font-800 px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Mã vé: SP-{ticket.id.toString().padStart(6, "0")}</span>
                      </div>
                      <h3 className="font-display font-700 text-white text-base leading-snug line-clamp-1 mb-1">{ticket.eventTitle}</h3>
                      <p className="text-xs text-gray-300 flex items-center gap-2">
                        <span>📅 {ticket.date}</span>
                        <span>•</span>
                        <span className="truncate">📍 {ticket.venue}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    {[
                      { icon: "🎫", label: t.tierLabel2, val: ticket.tier },
                      { icon: "💰", label: t.pricePaid, val: fmt(ticket.price) },
                      { icon: "📅", label: t.timeLabel, val: ticket.date },
                      { icon: "📍", label: t.venueLabel, val: ticket.venue },
                    ].map(item => (
                      <div key={item.label} className="min-w-0">
                        <p className="sp-filter-label text-[10px] flex items-center gap-1">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </p>
                        <p className="text-xs font-600 text-white mt-0.5 truncate">{item.val}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedTicketForPass(ticket)}
                    className="w-full py-3 px-4 rounded-xl font-display font-800 text-sm text-white transition-all shadow-lg flex items-center justify-center gap-2 mb-3"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #4F46E5 100%)",
                      boxShadow: "0 8px 24px -4px rgba(124, 58, 237, 0.45)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <span className="text-base">🎟️</span>
                    <span>Xem Vé Điện Tử & Mã Quét Cổng (QR / PDF)</span>
                  </button>

                  {isLocked && (
                    <div className="space-y-2">
                      <p className="text-xs text-center pb-1 text-gray-400">{t.checkinHint}</p>
                      <button
                        onClick={() => setCheckedIn(prev => new Set([...prev, ticket.id]))}
                        className="w-full py-2.5 rounded-xl font-display font-700 text-xs text-white transition-all hover:opacity-95 flex items-center justify-center gap-1.5"
                        style={{ background: "linear-gradient(135deg,#065F46,#059669)" }}
                      >
                        {t.checkinBtn}
                      </button>
                      <button
                        onClick={() => { addReportedTicket(ticket.id); openDispute(ticket); }}
                        className="w-full py-2 rounded-xl font-display font-700 text-xs transition-all flex items-center justify-center gap-1.5"
                        style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.25)", background: "transparent" }}
                      >
                        {t.reportBtn}
                      </button>
                    </div>
                  )}

                  {effectiveStatus === "dispute" && (
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
                      <p className="text-xs font-display font-700" style={{ color: "#F87171" }}>{t.reportedStatus}</p>
                      <button
                        onClick={() => nav("dispute-center")}
                        className="mt-2 text-xs font-display font-700 text-red-400 underline hover:text-red-300"
                      >
                        Xem tiến độ xử lý tại Trung tâm tranh chấp →
                      </button>
                    </div>
                  )}

                  {effectiveStatus === "completed" && (
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                      <p className="text-xs font-display font-700" style={{ color: "#34D399" }}>{t.completedMsg}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TicketPassModal
        ticket={selectedTicketForPass}
        isOpen={!!selectedTicketForPass}
        onClose={() => setSelectedTicketForPass(null)}
        buyerName={buyerName}
        buyerEmail={buyerEmail}
        isCheckedIn={selectedTicketForPass ? checkedIn.has(selectedTicketForPass.id) : false}
        isReported={selectedTicketForPass ? reportedTicketIds.includes(selectedTicketForPass.id) : false}
        onConfirmCheckin={(id) => setCheckedIn(prev => new Set([...prev, id]))}
        onReportIssue={(t) => { addReportedTicket(t.id); openDispute(t); }}
      />
    </div>
  );
}