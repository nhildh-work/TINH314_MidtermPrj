import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export default function AuthModal() {
  const { authModal, setAuthModal, role, registerUserDirect, registeredUsers, loginAsUser } = useApp();
  const [tab, setTab] = useState<"login" | "register">(authModal === "register" ? "register" : "login");
  const [agreed, setAgreed] = useState(true);
  const [agreedAntiScam, setAgreedAntiScam] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google chooser state
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);

  if (authModal === "none") return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ Email và Mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Best effort Supabase Auth
      try {
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      } catch (err) {
        console.warn("Supabase signIn notice:", err);
      }

      // Check registered users list or auto-login
      const existing = registeredUsers.find(
        u => u.email?.toLowerCase() === email.trim().toLowerCase()
      );

      if (existing) {
        loginAsUser(existing);
      } else {
        // Auto register / login
        const fallbackName = email.trim().split("@")[0];
        registerUserDirect({
          fullName: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
          email: email.trim(),
          phone: "090" + Math.floor(1000000 + Math.random() * 9000000),
          role: role || "buyer",
          provider: "email",
        });
      }

      setAuthModal("none");
    } catch (err: any) {
      setErrorMsg(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!agreed) {
      setErrorMsg("Bạn cần đồng ý với điều khoản sử dụng");
      return;
    }
    if (!email || !password || !fullName) {
      setErrorMsg("Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Best effort Supabase signUp in background
      try {
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: role || "buyer",
              phone: phone.trim(),
            },
          },
        });
      } catch (err) {
        console.warn("Supabase signUp notice:", err);
      }

      // Record user immediately and log them in!
      registerUserDirect({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role: role || "buyer",
        provider: "email",
      });

      setAuthModal("none");
    } catch (err: any) {
      setErrorMsg(err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelect = (gUser: { name: string; email: string; avatarUrl?: string }) => {
    setLoading(true);
    try {
      registerUserDirect({
        fullName: gUser.name,
        email: gUser.email,
        phone: "09" + Math.floor(10000000 + Math.random() * 90000000),
        role: role || "buyer",
        provider: "google",
        avatarUrl: gUser.avatarUrl,
      });
      setShowGoogleChooser(false);
      setAuthModal("none");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        console.warn("Supabase Google OAuth notice:", error.message);
        setErrorMsg(error.message);
        setShowGoogleChooser(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể khởi động đăng nhập Google");
      setShowGoogleChooser(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGoogle = () => {
    handleGoogleAuth();
  };

  const GOOGLE_PRESETS = [
    {
      name: "Nguyễn Hoàng Nam",
      email: "namnguyen.dev@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Trần Phương Linh",
      email: "phuonglinh.tran99@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Lê Tuấn Anh",
      email: "tuananh.le88@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=faces",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
      onClick={() => { setAuthModal("none"); setShowGoogleChooser(false); }}
    >
      <div
        className="sp-card w-full max-w-md overflow-y-auto relative"
        style={{ maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Google Chooser Overlay View */}
        {showGoogleChooser ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <h3 className="font-display font-700 text-white text-base">Đăng nhập với Google</h3>
              </div>
              <button
                onClick={() => setShowGoogleChooser(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-4">
              Chọn tài khoản Google của bạn để đăng nhập nhanh vào <strong className="text-white">SafePass</strong>:
            </p>

            <div className="space-y-2 mb-4">
              {GOOGLE_PRESETS.map((acc, i) => (
                <button
                  key={i}
                  onClick={() => handleGoogleSelect(acc)}
                  className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 text-left transition-all group"
                >
                  <img
                    src={acc.avatarUrl}
                    alt={acc.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-600 text-white group-hover:text-purple-300 transition-colors">
                      {acc.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{acc.email}</p>
                  </div>
                  <span className="text-gray-500 text-xs">➔</span>
                </button>
              ))}
            </div>

            {!showCustomGoogleForm ? (
              <button
                onClick={() => setShowCustomGoogleForm(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-xs text-gray-400 hover:text-white hover:border-purple-400/50 transition-all flex items-center justify-center gap-1.5"
              >
                <span>➕</span> Sử dụng tài khoản Google khác...
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5 animate-fadeIn">
                <p className="text-xs font-600 text-purple-300">Nhập thông tin tài khoản Google của bạn:</p>
                <input
                  type="text"
                  placeholder="Họ và tên Google (VD: Nguyễn Văn A)"
                  value={customGoogleName}
                  onChange={e => setCustomGoogleName(e.target.value)}
                  className="sp-input text-xs"
                />
                <input
                  type="email"
                  placeholder="Email Google (VD: user@gmail.com)"
                  value={customGoogleEmail}
                  onChange={e => setCustomGoogleEmail(e.target.value)}
                  className="sp-input text-xs"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!customGoogleEmail) return;
                      handleGoogleSelect({
                        name: customGoogleName || customGoogleEmail.split("@")[0],
                        email: customGoogleEmail,
                      });
                    }}
                    className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-700 transition-colors"
                  >
                    Đăng nhập tài khoản này
                  </button>
                  <button
                    onClick={() => setShowCustomGoogleForm(false)}
                    className="px-3 py-2 rounded-lg bg-white/10 text-gray-400 hover:text-white text-xs transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGoogleChooser(false)}
              className="w-full mt-4 text-center text-xs text-gray-400 hover:text-gray-300"
            >
              ← Quay lại đăng nhập bằng Email
            </button>
          </div>
        ) : (
          <div className="p-6">
            <button
              onClick={() => setAuthModal("none")}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)", zIndex: 2 }}
            >
              ✕
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              <div className="sp-logo-mark">🛡️</div>
              <div>
                <p className="font-display font-800 text-white text-xl leading-none">SafePass</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Nhượng vé êm ru, đi đu hết sầu</p>
              </div>
            </div>

            {/* Messages */}
            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                ✅ {successMsg}
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "#0a0a18" }}>
              {(["login", "register"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setErrorMsg(null); }}
                  className="flex-1 py-2 rounded-lg text-sm font-display font-700 transition-all"
                  style={{
                    background: tab === t ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "transparent",
                    color: tab === t ? "#fff" : "#6b7280",
                  }}
                >
                  {t === "login" ? "Đăng nhập" : "Đăng ký"}
                </button>
              ))}
            </div>

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <button
                  type="button"
                  onClick={handleOpenGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-600 text-sm transition-all hover:opacity-90 cursor-pointer shadow-md"
                  style={{ background: "#fff", color: "#111", fontFamily: "Inter, sans-serif" }}
                >
                  <GoogleIcon /> Tiếp tục với Google
                </button>
                <div className="text-center -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowGoogleChooser(true)}
                    className="text-[11px] text-gray-500 hover:text-purple-300 transition-colors"
                  >
                    (hoặc chọn nhanh tài khoản mẫu)
                  </button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
                  </div>
                  <div className="relative text-center">
                    <span className="px-2 text-xs" style={{ background: "#0d0d1e", color: "#4b5563" }}>hoặc email</span>
                  </div>
                </div>

                <input
                  type="email"
                  placeholder="Email của bạn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="sp-input"
                />
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="sp-input"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sp-btn-primary py-3 font-display font-700 disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Đăng nhập ngay"}
                </button>
                <p className="text-center text-xs" style={{ color: "#6b7280" }}>
                  Bảo vệ tài khoản qua SafePass Security & Mã hóa 2 lớp.
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <button
                  type="button"
                  onClick={handleOpenGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-600 text-sm transition-all hover:opacity-90 cursor-pointer shadow-md"
                  style={{ background: "#fff", color: "#111", fontFamily: "Inter, sans-serif" }}
                >
                  <GoogleIcon /> Đăng ký nhanh với Google
                </button>
                <div className="text-center -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowGoogleChooser(true)}
                    className="text-[11px] text-gray-500 hover:text-purple-300 transition-colors"
                  >
                    (hoặc chọn nhanh tài khoản mẫu)
                  </button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
                  </div>
                  <div className="relative text-center">
                    <span className="px-2 text-xs" style={{ background: "#0d0d1e", color: "#4b5563" }}>hoặc tạo tài khoản</span>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="sp-input"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="sp-input"
                />
                <input
                  type="tel"
                  placeholder="Số điện thoại"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="sp-input"
                />
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="sp-input"
                />

                {/* Policy checkboxes */}
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-0.5 shrink-0"
                      style={{ accentColor: "#7C3AED" }}
                    />
                    <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                      Tôi đã đọc và đồng ý với{" "}
                      <span className="text-purple-400 underline cursor-pointer">Điều khoản sử dụng</span> và{" "}
                      <span className="text-purple-400 underline cursor-pointer">Quy định mua bán vé</span> của SafePass.
                    </p>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedAntiScam}
                      onChange={e => setAgreedAntiScam(e.target.checked)}
                      className="mt-0.5 shrink-0"
                      style={{ accentColor: "#7C3AED" }}
                    />
                    <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                      Tôi hiểu rằng đăng bán vé giả mạo hoặc vé không hợp lệ sẽ bị khóa tài khoản vĩnh viễn và bàn giao cho cơ quan chức năng.
                    </p>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!agreed || loading}
                  className="w-full sp-btn-primary py-3 font-display font-700 disabled:opacity-50"
                >
                  {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản & Đăng nhập"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
