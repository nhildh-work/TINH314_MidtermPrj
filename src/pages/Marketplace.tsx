import { useState, useEffect } from "react";
import { useApp } from "../context";
import { TICKET_LISTINGS, EVENTS, type TicketListing } from "../data";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

function MinimapModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-700 text-white text-sm">📍 Sơ đồ khu vực ghế</p>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem" }}>✕</button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <img src={url} alt="Sơ đồ khu vực" className="w-full object-contain" style={{ maxHeight: "70vh", background: "#0d0d1e" }} />
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketListing }) {
  const { openCheckout, setSelectedEvent, nav, isLoggedIn, setAuthModal, t, lang } = useApp();
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      {showMap && ticket.minimapUrl && (
        <MinimapModal url={ticket.minimapUrl} onClose={() => setShowMap(false)} />
      )}
      <div className="sp-card sp-card-hover flex flex-col overflow-hidden">
        {/* Image */}
        <div className="relative h-44 overflow-hidden" style={{ borderRadius: "15px 15px 0 0" }}>
          <img
            src={ticket.eventImage}
            alt={ticket.eventTitle}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0d0d1e 0%, transparent 55%)" }} />
          <div className="absolute bottom-2.5 left-3 flex gap-1.5 flex-wrap">
            <span
              className="text-xs font-display font-700 px-2 py-0.5 rounded-full"
              style={{ color: ticket.tierColor, background: ticket.tierColor + "28", border: `1px solid ${ticket.tierColor}50` }}
            >
              {ticket.tier}
            </span>
            {ticket.verified && (
              <span className="text-xs font-display font-700 px-2 py-0.5 rounded-full text-lime-400" style={{ background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.3)" }}>
                {t.verifiedBadge}
              </span>
            )}
          </div>
          {ticket.minimapUrl && (
            <button
              onClick={e => { e.stopPropagation(); setShowMap(true); }}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-display font-700 transition-all"
              style={{ background: "rgba(7,7,17,0.75)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.12)", color: "#93C5FD" }}
            >
              🗺️ {lang === "en" ? "Map" : "Sơ đồ"}
            </button>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <button
            onClick={() => {
              const ev = EVENTS.find(e => e.id === ticket.eventId);
              if (ev) { setSelectedEvent(ev); nav("event-detail"); }
            }}
            className="text-left mb-0.5"
          >
            <h3 className="font-display font-700 text-white text-sm leading-snug line-clamp-2 hover:text-purple-300 transition-colors">
              {ticket.eventTitle}
            </h3>
          </button>
          <p className="text-xs mb-3" style={{ color: "#6b7280" }}>
            📍 {ticket.section} · {ticket.seat} · {ticket.city}
          </p>

          <div className="flex items-center gap-2 pb-3 mb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-700 text-white shrink-0" style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
              {ticket.sellerName[0]}
            </div>
            <p className="text-xs text-white font-600 truncate flex-1">{ticket.sellerName}</p>
          </div>

          <div className="flex items-end justify-between mt-auto">
            <div>
              <span className="font-display font-800 text-white text-lg">{fmt(ticket.price)}</span>
            </div>
            <button
              onClick={() => {
                if (!isLoggedIn) { setAuthModal("login"); return; }
                openCheckout(ticket);
              }}
              className="sp-btn-primary text-xs px-4 py-2"
            >
              {t.buyNow}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const ALL_TIERS = Array.from(new Set(TICKET_LISTINGS.map(t => t.tier)));
const ALL_CITIES = Array.from(new Set(TICKET_LISTINGS.map(t => t.city)));
const ALL_EVENTS = EVENTS;

export default function Marketplace() {
  const { setSelectedEvent, nav, t, dynamicMarketListings } = useApp();
  const [supabaseTickets, setSupabaseTickets] = useState<TicketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selTier, setSelTier] = useState("all");
  const [selCity, setSelCity] = useState("all");
  const [selEvent, setSelEvent] = useState("all");
  const [sort, setSort] = useState("default");

  useEffect(() => {
    async function fetchTickets() {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select(`
            *,
            profiles (
              id,
              full_name,
              email,
              role,
              avatar_url
            )
          `)
          .eq("status", "available")
          .order("created_at", { ascending: false });

        if (error) {
          // Fallback simple query without join if join fails
          const { data: rawData } = await supabase
            .from("tickets")
            .select("*")
            .eq("status", "available")
            .order("created_at", { ascending: false });

          if (rawData) {
            const mapped: TicketListing[] = rawData.map((item: any) => ({
              id: Number(item.id),
              eventId: 0,
              eventTitle: item.event_name,
              eventImage: item.event_image || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
              eventDate: item.event_date || "Sắp diễn ra",
              city: item.city || "TP.HCM",
              tier: item.tier || "Standard",
              tierColor: "#A78BFA",
              section: item.section || item.tier || "Khu vực chung",
              seat: item.seat || "Tự do",
              price: Number(item.price),
              officialPrice: Number(item.price),
              sellerName: "Người bán chính chủ",
              sellerScore: 5.0,
              sellerReviews: 10,
              verified: true,
            }));
            setSupabaseTickets(mapped);
          }
          return;
        }

        if (data) {
          const mapped: TicketListing[] = data.map((item: any) => ({
            id: Number(item.id),
            eventId: 0,
            eventTitle: item.event_name,
            eventImage: item.event_image || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
            eventDate: item.event_date || "Sắp diễn ra",
            city: item.city || "TP.HCM",
            tier: item.tier || "Standard",
            tierColor: "#A78BFA",
            section: item.section || item.tier || "Khu vực chung",
            seat: item.seat || "Tự do",
            price: Number(item.price),
            officialPrice: Number(item.price),
            sellerName: item.profiles?.full_name || item.profiles?.email?.split("@")[0] || "Người bán chính chủ",
            sellerScore: 5.0,
            sellerReviews: 10,
            verified: true,
          }));
          setSupabaseTickets(mapped);
        }
      } catch (err) {
        console.error("Lỗi kết nối Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();

    // Subscribe to realtime ticket updates across all users
    const channel = supabase
      .channel("public-tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    // Polling fallback every 5s
    const pollInterval = setInterval(fetchTickets, 5000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Kết hợp vé thật từ Supabase với dynamic listings và mock fallback (loại bỏ trùng ID)
  const combined = [...supabaseTickets, ...dynamicMarketListings, ...TICKET_LISTINGS];
  const seenIds = new Set<number>();
  const allListings = combined.filter(tk => {
    if (seenIds.has(tk.id)) return false;
    seenIds.add(tk.id);
    return true;
  });

  const filtered = allListings
    .filter(tk => {
      if (selTier !== "all" && tk.tier !== selTier) return false;
      if (selCity !== "all" && tk.city !== selCity) return false;
      if (selEvent !== "all" && tk.eventId !== Number(selEvent)) return false;
      if (priceMin && tk.price < Number(priceMin)) return false;
      if (priceMax && tk.price > Number(priceMax)) return false;
      return true;
    })
    .sort((a, b) =>
      sort === "price-asc" ? a.price - b.price :
      sort === "price-desc" ? b.price - a.price : 0
    );

  const resetFilters = () => {
    setPriceMin(""); setPriceMax(""); setSelTier("all");
    setSelCity("all"); setSelEvent("all");
  };

  return (
    <div className="max-w-[1680px] mx-auto px-5 lg:px-8 py-8 flex gap-7">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 hidden lg:block">
        <div className="sp-card p-5 sticky top-[88px] space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-800 text-white text-sm">{t.filtersLabel}</h2>
            <button onClick={resetFilters} className="text-xs" style={{ color: "#8B5CF6" }}>{t.clearAll}</button>
          </div>

          {/* Event */}
          <div>
            <p className="sp-filter-label mb-2">{t.eventLabel}</p>
            <select value={selEvent} onChange={e => setSelEvent(e.target.value)} className="sp-select">
              <option value="all">{t.allEvents}</option>
              {ALL_EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>

          {/* Price range */}
          <div>
            <p className="sp-filter-label mb-2">{t.priceRange}</p>
            <div className="flex gap-2">
              <input type="number" placeholder={t.from} value={priceMin} onChange={e => setPriceMin(e.target.value)} className="sp-input text-xs py-2" style={{ width: "48%" }} />
              <input type="number" placeholder="→" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="sp-input text-xs py-2" style={{ width: "48%" }} />
            </div>
          </div>

          {/* Tier */}
          <div>
            <p className="sp-filter-label mb-2">{t.tierLabel}</p>
            <div className="space-y-1.5">
              {["all", ...ALL_TIERS].map(tier => (
                <label key={tier} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: selTier === tier ? "#c4b5fd" : "#9ca3af" }}>
                  <input type="radio" name="tier" value={tier} checked={selTier === tier} onChange={() => setSelTier(tier)} style={{ accentColor: "#7C3AED" }} />
                  {tier === "all" ? t.allLabel : tier}
                </label>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <p className="sp-filter-label mb-2">{t.cityLabel}</p>
            <div className="space-y-1.5">
              {["all", ...ALL_CITIES].map(city => (
                <label key={city} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: selCity === city ? "#c4b5fd" : "#9ca3af" }}>
                  <input type="radio" name="city" value={city} checked={selCity === city} onChange={() => setSelCity(city)} style={{ accentColor: "#7C3AED" }} />
                  {city === "all" ? t.allLabel : city}
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Hero events strip */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {EVENTS.map(ev => (
              <button
                key={ev.id}
                onClick={() => { setSelectedEvent(ev); nav("event-detail"); }}
                className="relative rounded-2xl overflow-hidden shrink-0 group"
                style={{ width: 240, height: 120 }}
              >
                <img src={ev.image} alt={ev.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,7,17,0.9) 0%, transparent 60%)" }} />
                <div className="absolute bottom-0 left-0 p-3">
                  <p className="font-display font-700 text-white text-xs leading-tight line-clamp-2">{ev.title}</p>
                  <div className="flex gap-1 mt-1">
                    {ev.tags.map(tag => (
                      <span key={tag} className="text-xs font-display font-700 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.2)", color: "#F87171", fontSize: "0.6rem" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display font-800 text-white text-2xl">{t.marketplaceTitle}</h1>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{t.ticketsListed(filtered.length)}</p>
          </div>
          <select className="sp-select" style={{ width: "auto" }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="default">Mặc định</option>
            <option value="price-asc">{t.sort1}</option>
            <option value="price-desc">{t.sort2}</option>
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-display font-700 text-white mb-1">{t.noTickets}</p>
            <p className="text-sm" style={{ color: "#6b7280" }}>{t.adjustFilter}</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map(tk => <TicketCard key={tk.id} ticket={tk} />)}
          </div>
        )}
      </div>
    </div>
  );
}
