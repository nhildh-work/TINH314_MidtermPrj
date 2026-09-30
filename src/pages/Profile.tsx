import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

const BANKS = ["Vietcombank", "BIDV", "Techcombank", "VPBank", "MB Bank", "ACB", "Sacombank", "TPBank", "MSB"];
const LOCKED_NAME = "LÊ ĐOÀN HUYỀN NHI";

export default function Profile() {
  const { nav, setIsLoggedIn, currentProfile, currentUser, refreshProfile, t, loginAsUser } = useApp();
  const [fullName, setFullName] = useState(currentProfile?.full_name || "");
  const [phone, setPhone] = useState(currentProfile?.phone || "0901 234 567");
  const [bank, setBank] = useState("Vietcombank");
  const [accountNum, setAccountNum] = useState("0123456789");
  const [saved, setSaved] = useState(false);

  const displayName = currentProfile?.full_name || currentUser?.email || "Người dùng SafePass";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (currentProfile) {
      const updated = { ...currentProfile, full_name: fullName.trim(), phone: phone.trim() };
      loginAsUser(updated);
    }
    if (currentUser?.id) {
      try {
        await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() })
          .eq("id", currentUser.id);
        await refreshProfile();
      } catch (e) {
        console.warn("Supabase update error:", e);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const handleLogout = () => { setIsLoggedIn(false); nav("marketplace"); };

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
      <button onClick={() => nav("marketplace")} className="sp-btn-ghost text-sm px-3 py-2 mb-5 flex items-center gap-1.5">
        {t.backToMarket2}
      </button>

      <div className="sp-card overflow-hidden mb-5">
        <div className="h-28 relative" style={{ background: "linear-gradient(135deg, #2E1065, #4C1D95, #1E3A5F)" }}>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #A855F7, transparent)" }} />
          <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #22D3EE, transparent)" }} />
          <button
            onClick={handleLogout}
            className="absolute top-3 right-4 text-xs font-display font-700 px-3 py-1.5 rounded-lg transition-all"
            style={{ color: "#F87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            {t.logoutBtn}
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4 flex items-end gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-4 flex items-center justify-center font-display font-800 text-white text-2xl shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", borderColor: "#070711" }}
            >
              {currentProfile?.avatar_url ? (
                <img src={currentProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-800 text-white text-xl">{displayName}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full text-lime-400 font-display font-700 shrink-0" style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)" }}>
                  {currentProfile?.role === "seller" ? "Người bán uy tín" : t.verifiedLabel}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                {currentUser?.email || t.memberSince}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sp-card p-5 mb-4">
        <h2 className="font-display font-700 text-white text-sm mb-4">{t.personalInfo}</h2>
        <div className="space-y-3">
          <div>
            <p className="sp-filter-label mb-1.5">{t.fullName}</p>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="sp-input"
              placeholder="Nhập họ và tên của bạn"
            />
            <p className="text-xs mt-1" style={{ color: "#374151" }}>Tên hiển thị liên kết trực tiếp với tài khoản Supabase</p>
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">{t.phoneLabel}</p>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="sp-input" />
          </div>
        </div>
      </div>

      <div className="sp-card p-5 mb-4">
        <h2 className="font-display font-700 text-white text-sm mb-1">{t.bankAccount}</h2>
        <p className="text-xs mb-4" style={{ color: "#6b7280" }}>
          {t.bankAccountSub.split("**").map((p, i) => i % 2 === 1 ? <strong key={i} className="text-white">{p}</strong> : p)}
        </p>

        <div className="space-y-3">
          <div>
            <p className="sp-filter-label mb-1.5">{t.bankLabel}</p>
            <select value={bank} onChange={e => setBank(e.target.value)} className="sp-select">
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">{t.accountNumLabel}</p>
            <input type="text" value={accountNum} onChange={e => setAccountNum(e.target.value)} className="sp-input" placeholder={t.accountNumPh} />
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">{t.accountHolderLabel}</p>
            <div className="sp-input" style={{ background: "#0d0d1e", color: "#6b7280", cursor: "not-allowed", userSelect: "none" }}>
              {LOCKED_NAME}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)" }}>
          <span>🛡️</span>
          <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{t.bankMatchNote}</p>
        </div>
      </div>

      <div className="sp-card p-5 mb-5">
        <h3 className="font-display font-700 text-white text-sm mb-3">{t.payoutPolicyTitle}</h3>
        <ul className="space-y-2">
          {[t.checkinHint, t.withdrawSub, t.lockedNoCancel].map((item, i) => (
            <li key={i} className="flex gap-2 text-xs" style={{ color: "#9ca3af" }}>
              <span className="shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 sp-btn-primary py-3 font-display font-700"
          style={saved ? { background: "linear-gradient(135deg,#065F46,#059669)" } : {}}
        >
          {saved ? t.saveBtnDone : t.saveBtnIdle}
        </button>
        <button
          onClick={handleLogout}
          className="sp-btn-ghost py-3 px-6 font-display font-700"
          style={{ color: "#F87171", borderColor: "rgba(248,113,113,0.25)" }}
        >
          {t.logoutBtn}
        </button>
      </div>
    </div>
  );
}
