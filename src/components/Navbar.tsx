import { useState } from "react";
import { useApp } from "../context";
import SafePassLogo from "./Logo";

export default function Navbar() {
  const { role, setRole, cartCount, nav, isLoggedIn, setIsLoggedIn, setAuthModal, currentProfile, currentUser, t, registeredUsers, setShowUsersModal } = useApp();
  const [search, setSearch] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = currentProfile?.full_name || currentUser?.email || "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sp-navbar sticky top-0 z-50">
      <div className="max-w-[1680px] mx-auto px-5 lg:px-8 h-[72px] flex items-center gap-4">
        {/* Logo */}
        <button onClick={() => nav("marketplace")} className="shrink-0">
          <SafePassLogo size={38} showText />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-2xl relative">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: "#4b5563" }}
          >
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className="sp-search-input"
          />
        </div>

        {/* Role Toggle */}
        <div className="sp-role-toggle">
          <button
            className={`sp-role-btn ${role === "buyer" ? "active" : ""}`}
            onClick={() => { setRole("buyer"); nav("marketplace"); }}
          >
            {t.buyTickets}
          </button>
          <button
            className={`sp-role-btn ${role === "seller" ? "active" : ""}`}
            onClick={() => { setRole("seller"); nav("seller-dash"); }}
          >
            {t.sellTickets}
          </button>
        </div>

        {/* Cart */}
        <button className="sp-cart-btn" onClick={() => { if (isLoggedIn) nav("my-tickets"); else setAuthModal("login"); }}>
          <span>🛍️</span>
          {cartCount > 0 && <span className="sp-cart-badge">{cartCount}</span>}
        </button>

        {/* Auth */}
        {isLoggedIn ? (
          <div className="relative shrink-0">
            <button onClick={() => setShowUserMenu(v => !v)} className="sp-avatar-btn ring-2 ring-purple-500/30">
              {currentProfile?.avatar_url ? (
                <img src={currentProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                userInitials
              )}
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 top-12 rounded-2xl overflow-hidden z-50 py-1"
                style={{ background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.1)", minWidth: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}
              >
                <div className="px-4 py-2.5 border-b border-white/5">
                  <p className="text-xs font-700 text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{currentUser?.email || currentProfile?.email}</p>
                </div>

                <button
                  onClick={() => { setShowUserMenu(false); nav("profile"); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-display font-600 text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <span>👤</span>
                  <span>{t.myAccount}</span>
                </button>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

                <button
                  onClick={() => { setShowUserMenu(false); setIsLoggedIn(false); nav("marketplace"); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-display font-600 transition-colors flex items-center gap-2"
                  style={{ color: "#F87171" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span>🚪</span>
                  <span>{t.logout}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setAuthModal("login")} className="sp-btn-ghost text-sm px-4 py-2 hidden sm:flex">
              {t.login}
            </button>
            <button onClick={() => setAuthModal("register")} className="sp-btn-primary text-sm px-4 py-2">
              {t.register}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
