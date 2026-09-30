import { useState } from "react";
import { useApp } from "../context";
import { TICKET_LISTINGS } from "../data";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

type TabId = "info" | "tickets" | "map";

export default function EventDetail() {
  const { selectedEvent, openCheckout, nav, isLoggedIn, setAuthModal } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("tickets");

  if (!selectedEvent) return null;

  const listings = TICKET_LISTINGS.filter(t => t.eventId === selectedEvent.id);

  const handleBuy = (ticket: typeof TICKET_LISTINGS[0]) => {
    if (!isLoggedIn) { setAuthModal("login"); return; }
    openCheckout(ticket);
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: "info", label: "Thông tin" },
    { id: "tickets", label: `Vé đang bán (${listings.length})` },
    { id: "map", label: "Sơ đồ chỗ ngồi" },
  ];

  const statusColor = (pct: number) => pct > 80 ? "#F87171" : pct > 50 ? "#FBBF24" : "#A3E635";

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 340 }}>
        <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(7,7,17,0.96) 0%, rgba(7,7,17,0.55) 55%, transparent 100%)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #070711 0%, transparent 50%)" }} />

        <button
          onClick={() => nav("marketplace")}
          className="absolute top-5 left-5 sp-btn-ghost text-xs px-3 py-1.5"
        >
          ← Chợ vé
        </button>

        <div className="absolute bottom-0 left-0 p-8 md:p-10 max-w-2xl">
          <div className="flex gap-2 mb-3">
            {selectedEvent.tags.map(tag => (
              <span key={tag} className="text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#F87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                {tag}
              </span>
            ))}
          </div>
          <h1 className="font-display font-900 text-white leading-tight mb-1.5" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)" }}>
            {selectedEvent.title}
          </h1>
          <p className="text-sm mb-3" style={{ color: "#A78BFA" }}>{selectedEvent.artist}</p>
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: "#9ca3af" }}>
            <span>📅 {selectedEvent.date} · {selectedEvent.time}</span>
            <span>📍 {selectedEvent.venue}, {selectedEvent.city}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1680px] mx-auto px-5 lg:px-8 py-6 flex gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "#0a0a18" }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2 rounded-lg text-xs font-display font-700 transition-all"
                style={{
                  background: activeTab === tab.id ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "transparent",
                  color: activeTab === tab.id ? "#fff" : "#6b7280",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* INFO */}
          {activeTab === "info" && (
            <div className="sp-card p-6 space-y-4">
              <h2 className="font-display font-700 text-white text-lg">Về sự kiện</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                {selectedEvent.artist} mang đến một đêm diễn đỉnh cao với loạt hit bất hủ tại {selectedEvent.venue}. Đây là sự kiện không thể bỏ lỡ trong năm 2026, với quy mô hoành tráng và dàn nghệ sĩ hàng đầu.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { icon: "📅", label: "Ngày diễn", val: selectedEvent.date },
                  { icon: "🕐", label: "Giờ mở cửa", val: selectedEvent.time },
                  { icon: "📍", label: "Địa điểm", val: selectedEvent.venue },
                  { icon: "🏙️", label: "Thành phố", val: selectedEvent.city },
                ].map(item => (
                  <div key={item.label} className="flex gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="sp-filter-label">{item.label}</p>
                      <p className="text-sm font-500 text-white mt-0.5">{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TICKETS */}
          {activeTab === "tickets" && (
            <div className="space-y-3">
              {listings.length === 0 ? (
                <div className="sp-card p-10 text-center">
                  <p className="text-3xl mb-2">🎟️</p>
                  <p className="font-display font-600 text-white">Chưa có vé nào được đăng bán</p>
                </div>
              ) : listings.map(ticket => (
                <div
                  key={ticket.id}
                  className="sp-card p-4 flex items-center gap-4 transition-all hover:border-purple-500/30"
                >
                  {/* Tier */}
                  <div className="shrink-0 text-center" style={{ width: 80 }}>
                    <span
                      className="block text-xs font-display font-700 px-2 py-1 rounded-lg mb-1"
                      style={{ color: ticket.tierColor, background: ticket.tierColor + "22", border: `1px solid ${ticket.tierColor}40` }}
                    >
                      {ticket.tier}
                    </span>
                    <p className="text-xs" style={{ color: "#6b7280" }}>{ticket.section}</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>{ticket.seat}</p>
                  </div>

                  {/* Seller info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-700 text-white shrink-0" style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
                        {ticket.sellerName[0]}
                      </div>
                      <span className="text-sm text-white font-600">{ticket.sellerName}</span>
                      {ticket.verified && (
                        <span className="text-xs font-700 px-1.5 py-0.5 rounded text-lime-400" style={{ background: "rgba(163,230,53,0.08)" }}>
                          ✓ Đã xác minh
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-xs font-700 text-amber-400">{ticket.sellerScore}</span>
                      <span className="text-xs" style={{ color: "#4b5563" }}>({ticket.sellerReviews} đánh giá)</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <span className="text-xs font-display font-700 px-2.5 py-1 rounded-full text-lime-400" style={{ background: "rgba(163,230,53,0.1)" }}>
                      AVAILABLE
                    </span>
                  </div>

                  {/* Price & Buy */}
                  <div className="shrink-0 text-right">
                    <p className="font-display font-800 text-white text-lg leading-none">{fmt(ticket.price)}</p>
                    <p className="text-xs mb-2" style={{ color: "#4b5563" }}>Gốc {fmt(ticket.officialPrice)}</p>
                    <button onClick={() => handleBuy(ticket)} className="sp-btn-primary text-xs px-4 py-1.5">
                      Mua ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MAP */}
          {activeTab === "map" && (
            <div className="sp-card p-6">
              <h2 className="font-display font-700 text-white text-lg mb-5">Sơ đồ khu vực</h2>
              <div className="rounded-xl p-6" style={{ background: "#0a0a14", border: "1px dashed rgba(139,92,246,0.3)" }}>
                <div className="text-center mb-5">
                  <div className="inline-block px-8 py-2 rounded-lg text-xs font-display font-700" style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}>
                    🎭 SÂN KHẤU
                  </div>
                </div>
                <div className="space-y-2 max-w-xs mx-auto">
                  {selectedEvent.tiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-display font-700"
                        style={{ background: tier.color + "18", border: `1px solid ${tier.color}40`, color: tier.color }}
                      >
                        {tier.name}
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "#6b7280" }}>từ {fmt(tier.officialPrice)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs mt-4" style={{ color: "#374151" }}>Sơ đồ mang tính minh họa</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="sp-card p-4 sticky top-24 space-y-4">
            {/* Sold bar */}
            <div>
              <div className="flex justify-between mb-1">
                <p className="sp-filter-label">Vé gốc</p>
                <p className="text-xs font-700" style={{ color: statusColor(selectedEvent.soldPercent) }}>
                  {selectedEvent.soldPercent}% bán
                </p>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "#1e1e30" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${selectedEvent.soldPercent}%`, background: statusColor(selectedEvent.soldPercent) }} />
              </div>
            </div>

            {/* Market prices */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
              <p className="sp-filter-label mb-2">Giá thị trường</p>
              {selectedEvent.tiers.map((tier, i) => {
                const tierListings = listings.filter(l => l.tier === tier.name);
                const min = tierListings.length ? Math.min(...tierListings.map(l => l.price)) : null;
                return (
                  <div key={i} className="flex justify-between items-center py-1.5">
                    <span className="text-xs font-600" style={{ color: tier.color }}>{tier.name}</span>
                    <span className="text-xs font-700 text-white">
                      {min ? `từ ${fmt(min)}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Vé bán */}
            <div className="text-center py-2 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <p className="font-display font-800 text-white text-2xl">{listings.length}</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>vé đang bán lại</p>
            </div>

            <div className="p-3 rounded-xl" style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)" }}>
              <p className="text-xs" style={{ color: "#9ca3af" }}>🛡️ Vé xác thực 100% hoặc hoàn tiền đầy đủ.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
