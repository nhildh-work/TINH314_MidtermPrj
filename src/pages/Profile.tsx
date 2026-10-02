import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const { currentProfile, currentUser, refreshProfile, nav } = useApp();
  
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile) {
      setBankName(currentProfile.bank_name || "Vietcombank");
      setBankAccount(currentProfile.bank_account || "");
      setBankHolder(currentProfile.bank_holder || currentProfile.full_name || "");
    }
  }, [currentProfile]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setMsg(null);

    try {
      const { error } = await supabase.from("profiles").update({
        bank_name: bankName,
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim().toUpperCase(),
      }).eq("id", currentUser.id);

      if (error) throw error;

      await refreshProfile(); // ĐỒNG BỘ SANG SELLERDASH
      setMsg("✓ Đã lưu thông tin tài khoản thành công!");
    } catch (e: any) {
      setMsg("❌ Lỗi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <h1 className="font-display font-800 text-white text-2xl">Thông Tin Cá Nhân & Tài Khoản Ngân Hàng</h1>

      <div className="sp-card p-6 space-y-4">
        <div>
          <label className="sp-filter-label mb-1.5 block">Họ và tên[cite: 24]</label>
          <input value={currentProfile?.full_name || "LÊ ĐOÀN HUYỀN NHI"} readOnly disabled className="sp-input font-bold bg-white/5 cursor-not-allowed" />
        </div>

        <div>
          <label className="sp-filter-label mb-1.5 block">Email liên hệ</label>
          <input value={currentUser?.email || "nhihkh.work@gmail.com"} readOnly disabled className="sp-input bg-white/5 cursor-not-allowed" />
        </div>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <h2 className="font-display font-800 text-white text-base">Tài Khoản Ngân Hàng (Đồng bộ Bảng điều khiển)</h2>

          <div>
            <label className="sp-filter-label mb-1.5 block">Ngân hàng thụ hưởng</label>
            <select value={bankName} onChange={e => setBankName(e.target.value)} className="sp-select">
              <option value="Vietcombank">Vietcombank</option>
              <option value="MB Bank">MB Bank (Quân Đội)</option>
              <option value="Techcombank">Techcombank</option>
              <option value="BIDV">BIDV</option>
              <option value="VPBank">VPBank</option>
              <option value="ACB">ACB</option>
              <option value="TPBank">TPBank</option>
              <option value="Vietinbank">Vietinbank</option>
            </select>
          </div>

          <div>
            <label className="sp-filter-label mb-1.5 block">Số tài khoản ngân hàng</label>
            <input
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
              className="sp-input font-mono"
              placeholder="Nhập số tài khoản..."
            />
          </div>

          <div>
            <label className="sp-filter-label mb-1.5 block">Tên chủ tài khoản</label>
            <input
              value={bankHolder}
              onChange={e => setBankHolder(e.target.value)}
              className="sp-input uppercase font-bold tracking-wide"
              placeholder="Nhập tên chủ tài khoản..."
            />
          </div>

          {msg && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
              {msg}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sp-btn-primary py-3 font-bold text-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu Thông Tin Ngân Hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}