import React, { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";
import { PolicyModal } from "../components/PolicyModal";

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
  
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  if (authModal === "none") return null;

  const handleClose = () => {
    setAuthModal("none");
    setShowGoogleChooser(false);
    setErrorMsg(null);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ Email và Mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      let supabaseSuccess = false;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (data?.user && !error) {
          supabaseSuccess = true;
        }
      } catch (err) {
        console.warn("Supabase signIn error:", err);
      }

      const existing = (registeredUsers || []).find(
        u => u.email?.toLowerCase() === email.trim().toLowerCase()
      );

      if (existing) {
        loginAsUser(existing);
        handleClose();
      } else if (supabaseSuccess) {
        handleClose();
      } else {
        setErrorMsg("Tài khoản chưa được đăng ký hoặc sai mật khẩu. Vui lòng bấm sang tab 'Đăng ký' để tạo tài khoản mới!");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!agreed) {
      setErrorMsg("Bạn cần đồng ý với Điều khoản & Chính sách giao dịch của SafePass");
      return;
    }
    if (!email.trim() || !password || !fullName.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu");
      return;
    }

    const existing = (registeredUsers || []).find(
      u => u.email?.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      setErrorMsg("Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab 'Đăng nhập'!");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

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
        console.warn("Supabase signUp error:", err);
      }

      registerUserDirect({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role: role || "buyer",
        provider: "email",
      });

      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Đăng ký thất bại");
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
        setShowGoogleChooser(true);
      }
    } catch (err) {
      setShowGoogleChooser(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleName.trim()) {
      setErrorMsg("Vui lòng nhập họ tên và email Google của bạn");
      return;
    }
    if (tab === "register" && !agreed) {
      setErrorMsg("Bạn cần đồng ý với Điều khoản & Chính sách giao dịch của SafePass");
      return;
    }
    setLoading(true);
    try {
      registerUserDirect({
        fullName: customGoogleName.trim(),
        email: customGoogleEmail.trim(),
        role: role || "buyer",
        provider: "google",
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-[#0f0f23] border border-white/10 shadow-2xl overflow-y-auto relative p-6 text-white"
          style={{ maxHeight: "90vh" }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            ✕
          </button>

          {showGoogleChooser ? (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <GoogleIcon />
                <h3 className="font-display font-700 text-white text-base">Đăng nhập tài khoản Google</h3>
              </div>

              <p className="text-xs text-gray-300 mb-4">
                Nhập email Google của bạn để liên kết nhanh vào SafePass:
              </p>

              <form onSubmit={handleCustomGoogleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={e => setCustomGoogleName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="sp-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Địa chỉ Gmail</label>
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={e => setCustomGoogleEmail(e.target.value)}
                    placeholder="user@gmail.com"
                    className="sp-input w-full"
                    required
                  />
                </div>
                
                {tab === "register" && (
                  <div className="flex items-start gap-3 my-4">
                    <input 
                      type="checkbox" 
                      id="terms-check-google"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="terms-check-google" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                      Tôi đã đọc và đồng ý với{' '}
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                        className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                      >
                        Điều khoản & Chính sách giao dịch
                      </button>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (tab === "register" && !agreed)}
                  className="w-full py-2.5 rounded-xl font-display font-700 text-white text-sm bg-purple-600 hover:bg-purple-700 transition-colors mt-2 disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận đăng nhập Google"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowGoogleChooser(false)}
                className="w-full mt-4 text-center text-xs text-gray-400 hover:text-gray-300"
              >
                ← Quay lại
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <p className="font-display font-800 text-white text-xl leading-none">SafePass</p>
                  <p className="text-xs text-gray-400 mt-1">Sàn nhượng vé sự kiện an toàn</p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-1 p-1 rounded-xl mb-5 bg-[#070716] border border-white/5">
                <button
                  type="button"
                  onClick={() => { setTab("login"); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-display font-700 transition-all ${
                    tab === "login" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("register"); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-display font-700 transition-all ${
                    tab === "register" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Đăng ký
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-gray-100 text-gray-900 transition-all mb-4 shadow cursor-pointer"
              >
                <GoogleIcon />
                <span>{tab === "login" ? "Tiếp tục với Google" : "Đăng ký nhanh với Google"}</span>
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative px-3 text-xs bg-[#0f0f23] text-gray-500">hoặc dùng email</span>
              </div>

              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="sp-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Mật khẩu</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="sp-input w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sp-btn-primary py-3 font-display font-700 mt-2 disabled:opacity-50"
                  >
                    {loading ? "Đang kiểm tra tài khoản..." : "Đăng nhập ngay"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Họ và tên của bạn</label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      className="sp-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Email đăng ký</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="sp-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Số điện thoại (nhận vé)</label>
                    <input
                      type="tel"
                      placeholder="09xx xxx xxx"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="sp-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Mật khẩu</label>
                    <input
                      type="password"
                      placeholder="Ít nhất 6 ký tự"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="sp-input w-full"
                    />
                  </div>

                  <div className="flex items-start gap-3 my-5 pt-2">
                    <input 
                      type="checkbox" 
                      id="terms-check"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#13132a] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                    <label htmlFor="terms-check" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                      Tôi đã đọc và đồng ý với{' '}
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                        className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                      >
                        Điều khoản & Chính sách giao dịch
                      </button>
                      {' '}của nền tảng.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!agreed || loading}
                    className="w-full sp-btn-primary py-3 font-display font-700 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản SafePass"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      
      <PolicyModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}