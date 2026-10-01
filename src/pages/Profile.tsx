import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

const BANKS = ["Vietcombank", "BIDV", "Techcombank", "VPBank", "MB Bank", "ACB", "Sacombank", "TPBank", "MSB"];

export default function Profile() {
  const { nav, setIsLoggedIn, currentProfile, currentUser, refreshProfile, t, loginAsUser, kycStatus, setRole } = useApp();
  const [fullName, setFullName] = useState(currentProfile?.full_name || "");
  const [phone, setPhone] = useState(currentProfile?.phone || "");
  const [bank, setBank] = useState("Vietcombank");
  const [accountNum, setAccountNum] = useState("");
  const [saved, setSaved] = useState(false);

  const displayName = currentProfile?.full_name || currentUser?.email || "Người dùng SafePass";
  const userInitials = displayName.slice(0, 2).toUpperCase();
  const isSeller = currentProfile?.role === "seller";

  const handleSave = async () => {
    if (currentProfile) {
      const updated = { ...currentProfile, full_name: fullName.trim(), phone: phone.trim() };
      loginAsUser(updated);
    }
    if (currentUser?.id) {
      try {
        await supabase
          .from("profiles")
          .update({ full_name: fullName.trim(), phone: phone.trim() })
          .eq("id", currentUser.id);
        await refreshProfile();
      } catch (e) {
        console.warn("Supabase update error:", e);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    nav("marketplace");
  };

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
      <button onClick={() => nav("marketplace")} className="sp-btn-ghost text-sm px-3 py-2 mb-5 flex items-center gap-1.5">
        ← {t.backToMarket2}
      </button>

      {/* Profile Header */}
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
                {isSeller ? (
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-display font-700 shrink-0"
                    style={{
                      background: kycStatus === "approved" ? "rgba(163,230,53,0.1)" : "rgba(251,191,36,0.1)",
                      color: kycStatus === "approved" ? "#A3E635" : "#FBBF24",
                      border: kycStatus === "approved" ? "1px solid rgba(163,230,53,0.3)" : "1px solid rgba(251,191,36,0.3)",
                    }}
                  >
                    {kycStatus === "approved" ? "✓ Người bán đã xác minh KYC" : "⚠️ Người bán chưa KYC"}
                  </span>
                ) : (
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-display font-700 shrink-0 text-blue-400"
                    style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)" }}
                  >
                    Tài khoản Người mua
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 text-gray-400">
                {currentUser?.email || currentProfile?.email || "Chưa có email"}
                {currentProfile?.provider === "google" && <span className="ml-2 text-purple-400 font-semibold">(Đăng nhập qua Google)</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin tài khoản cơ bản */}
      <div className="sp-card p-5 mb-4">
        <h2 className="font-display font-700 text-white text-sm mb-4">Thông tin cá nhân</h2>
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
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">Số điện thoại liên hệ nhận vé / hỗ trợ</p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="sp-input"
              placeholder="09xx xxx xxx"
            />
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">Email tài khoản</p>
            <input
              type="text"
              disabled
              value={currentUser?.email || currentProfile?.email || ""}
              className="sp-input opacity-60 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-500 mt-1">Email được quản lý bởi tài khoản đăng nhập của bạn.</p>
          </div>
        </div>
      </div>

      {/* NẾU LÀ NGƯỜI MUA: HIỂN THỊ LỐI TẮT MUA VÉ & CHUYỂN ĐỔI NGƯỜI BÁN */}
      {!isSeller && (
        <div className="sp-card p-5 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-700 text-white text-sm">Bạn muốn đăng bán vé dư?</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Chuyển sang chế độ Người bán để đăng vé nhượng lại an toàn trên SafePass.
              </p>
            </div>
            <button
              onClick={() => {
                setRole("seller");
                nav("seller-dash");
              }}
              className="sp-btn-primary px-4 py-2 text-xs font-display font-700 shrink-0"
            >
              Chuyển sang Người bán →
            </button>
          </div>

          <div className="pt-3 border-t border-white/5 flex gap-3">
            <button
              onClick={() => nav("my-tickets")}
              className="flex-1 py-2.5 rounded-xl text-xs font-display font-700 bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-2"
            >
              <span>🎟️</span> Xem vé đã mua của tôi
            </button>
            <button
              onClick={() => nav("marketplace")}
              className="flex-1 py-2.5 rounded-xl text-xs font-display font-700 bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2"
            >
              <span>🔍</span> Khám phá sự kiện hot
            </button>
          </div>
        </div>
      )}

      {/* NẾU LÀ NGƯỜI BÁN: MỚI CẦN KYC CCCD VÀ TÀI KHOẢN NGÂN HÀNG ĐỂ NHẬN TIỀN */}
      {isSeller && (
        <>
          {/* KYC Status Block */}
          <div className="sp-card p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display font-700 text-white text-sm">Xác thực danh tính (KYC Người bán)</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  SafePass yêu cầu người bán xác thực CCCD để ngăn chặn hành vi bán vé ảo, vé giả.
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-lg font-display font-700"
                style={{
                  background: kycStatus === "approved" ? "rgba(163,230,53,0.15)" : "rgba(251,191,36,0.15)",
                  color: kycStatus === "approved" ? "#A3E635" : "#FBBF24",
                }}
              >
                {kycStatus === "approved" ? "ĐÃ XÁC THỰC" : "CHƯA XÁC THỰC"}
              </span>
            </div>

            {kycStatus !== "approved" && (
              <button
                onClick={() => nav("kyc")}
                className="w-full py-2.5 rounded-xl text-xs font-display font-700 text-white bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                Bắt đầu xác minh CCCD ngay →
              </button>
            )}
          </div>

          {/* Bank Account Block */}
          <div className="sp-card p-5 mb-4">
            <h2 className="font-display font-700 text-white text-sm mb-1">{t.bankAccount}</h2>
            <p className="text-xs mb-4 text-gray-400">
              Tài khoản ngân hàng dùng để SafePass giải ngân tiền vé sau khi sự kiện hoàn tất hoặc check-in thành công.
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
                <input
                  type="text"
                  value={accountNum}
                  onChange={e => setAccountNum(e.target.value)}
                  className="sp-input"
                  placeholder="Nhập số tài khoản ngân hàng của bạn"
                />
              </div>
              <div>
                <p className="sp-filter-label mb-1.5">Tên chủ tài khoản (Phải trùng khớp với họ tên người bán)</p>
                <div className="sp-input bg-black/40 text-gray-300 font-bold select-none">
                  {fullName ? fullName.toUpperCase() : "CHƯA CẬP NHẬT HỌ TÊN"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm">🛡️</span>
              <p className="text-xs leading-relaxed text-amber-200/90">
                Để bảo vệ quyền lợi và phòng chống rửa tiền, tên chủ tài khoản ngân hàng phải trùng khớp 100% với tên người bán trên SafePass.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Save & Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          className="flex-1 sp-btn-primary py-3 font-display font-700 text-sm"
          style={saved ? { background: "linear-gradient(135deg,#065F46,#059669)" } : {}}
        >
          {saved ? "✓ Đã lưu thay đổi thành công!" : "Lưu thông tin tài khoản"}
        </button>
      </div>
    </div>
  );
}
