import { useState } from "react";
import { useApp } from "../context";
import type { ProfileRecord } from "../lib/supabaseClient";

export default function RegisteredUsersModal() {
  const { showUsersModal, setShowUsersModal, registeredUsers, loginAsUser, deleteRegisteredUser, currentProfile } = useApp();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  if (!showUsersModal) return null;

  const filtered = registeredUsers.filter(u => {
    const matchSearch =
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || "").includes(search);
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(registeredUsers, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "Mới đăng ký";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={() => setShowUsersModal(false)}
    >
      <div
        className="sp-card w-full max-w-4xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-800 text-white text-lg">Danh Sách Người Đăng Ký</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-700 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {registeredUsers.length} thành viên
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Ghi nhận tự động từ Supabase Database & Phiên bản bộ nhớ SafePass
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg text-xs font-600 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
            >
              {copied ? "✅ Đã chép JSON" : "📋 Xuất danh sách"}
            </button>
            <button
              onClick={() => setShowUsersModal(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="px-6 py-3 bg-[#0a0a16] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "Tất cả" },
              { id: "buyer", label: "Người mua" },
              { id: "seller", label: "Người bán" },
              { id: "admin", label: "Admin" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-600 transition-all ${
                  filterRole === tab.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* User list table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Không tìm thấy người dùng nào phù hợp.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(user => {
                const isCurrent = currentProfile?.id === user.id || currentProfile?.email === user.email;
                const initials = (user.full_name || user.email || "SP").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-purple-950/20 border-purple-500/40 shadow-sm"
                        : "bg-[#0c0c1e] border-white/5 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-display font-800 text-white text-sm">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-700 text-white text-sm truncate">
                            {user.full_name || "Chưa đặt tên"}
                          </h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-700 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Đang đăng nhập
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-700 border ${
                              user.role === "admin"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : user.role === "seller"
                                ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                            }`}
                          >
                            {user.role === "admin" ? "🛡️ Quản trị viên" : user.role === "seller" ? "🏪 Người bán" : "🎟️ Người mua"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-600 bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1">
                            {user.provider === "google" ? "🔴 Google" : "✉️ Email"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                          <span className="truncate">✉️ {user.email}</span>
                          {user.phone && <span>📞 {user.phone}</span>}
                          <span>📅 {formatDate(user.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!isCurrent && (
                        <button
                          onClick={() => loginAsUser(user)}
                          className="px-3 py-1.5 rounded-lg text-xs font-700 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 transition-all"
                        >
                          Đăng nhập tk này
                        </button>
                      )}
                      {user.id !== "sp-usr-admin" && (
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa tài khoản "${user.full_name || user.email}" khỏi danh sách?`)) {
                              deleteRegisteredUser(user.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Xóa người dùng"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0a0a16] border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>🛡️ SafePass User Directory</span>
          <button
            onClick={() => setShowUsersModal(false)}
            className="px-4 py-1.5 rounded-lg text-xs font-display font-700 bg-white/10 hover:bg-white/15 text-white transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
