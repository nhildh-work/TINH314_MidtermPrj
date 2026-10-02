import { useState, useEffect, useRef } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const { currentProfile, currentUser, refreshProfile, nav } = useApp();
  
  const [fullName, setFullName] = useState("");
  // Kéo SĐT từ profile, nếu chưa có thì track SĐT từ hệ thống Auth (nếu đăng ký thủ công bằng SĐT)
  const [phone, setPhone] = useState("");
  
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProfile) {
      setFullName(currentProfile.full_name || "");
      setPhone(currentProfile.phone || currentUser?.phone || "");
      setBankName(currentProfile.bank_name || "Vietcombank");
      setBankAccount(currentProfile.bank_account || "");
      setBankHolder(currentProfile.bank_holder || currentProfile.full_name || "");
      setAvatarUrl(currentProfile.avatar_url || "");
    }
  }, [currentProfile, currentUser]);

  // HÀM UPLOAD AVATAR
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMsg(null);
      const file = e.target.files?.[0];
      if (!file || !currentUser) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;

      // Tải lên bucket 'avatars' (Nhớ tạo bucket này dạng Public trên Supabase)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      
      // Lưu URL ngay vào bảng profiles
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", currentUser.id);
      await refreshProfile();
      setMsg("✓ Đã cập nhật ảnh đại diện thành công!");
    } catch (err: any) {
      setMsg("❌ Lỗi tải ảnh: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setMsg(null);

    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim().toUpperCase(),
        phone: phone.trim(),
        bank_name: bankName,
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim().toUpperCase(),
      }).eq("id", currentUser.id);

      if (error) throw error;

      // Cập nhật dự phòng vào auth metadata để an toàn
      await supabase.auth.updateUser({
        data: {
          phone: phone.trim(),
          bank_name: bankName,
          bank_account: bankAccount.trim(),
          bank_holder: bankHolder.trim().toUpperCase(),
        }
      });

      await refreshProfile();
      setMsg("✓ Đã lưu thông tin cá nhân và tài khoản thành công!");
    } catch (e: any) {
      setMsg("❌ Lỗi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // Reload cứng để xóa sạch state và văng ra trang chủ
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <h1 className="font-display font-800 text-white text-2xl text-center">Trang Cá Nhân</h1>

      <div className="sp-card p-6 md:p-8 space-y-5">
        {/* AVATAR UPLOAD */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center overflow-hidden cursor-pointer relative group shadow-lg"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold text-white">Đổi ảnh</span>
            </div>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
          {uploading && <p className="text-xs text-purple-400 mt-2 font-bold animate-pulse">Đang tải ảnh lên...</p>}
        </div>

        {/* THÔNG TIN CÁ NHÂN */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="sp-filter-label mb-1.5 block">Email liên kết</label>
            <input value={currentUser?.email || ""} readOnly disabled className="sp-input bg-white/5 cursor-not-allowed opacity-80" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="sp-filter-label mb-1.5 block">Họ và tên (Trùng CCCD) *</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="sp-input uppercase font-bold" />
            </div>
            <div>
              <label className="sp-filter-label mb-1.5 block">Số điện thoại liên hệ *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="sp-input font-mono" placeholder="Nhập số điện thoại..." />
            </div>
          </div>
        </div>

        {/* THÔNG TIN NGÂN HÀNG */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <h2 className="font-display font-800 text-white text-base">Tài Khoản Ngân Hàng (Nhận Tiền Vé / Hoàn Cọc)</h2>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="sp-filter-label mb-1.5 block">Số tài khoản ngân hàng</label>
              <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="sp-input font-mono" placeholder="Nhập số tài khoản..." />
            </div>
            <div>
              <label className="sp-filter-label mb-1.5 block">Tên chủ tài khoản</label>
              <input value={bankHolder} onChange={e => setBankHolder(e.target.value)} className="sp-input uppercase font-bold tracking-wide" placeholder="VD: LÊ ĐOÀN HUYỀN NHI" />
            </div>
          </div>

          {msg && (
            <div className={`p-3.5 rounded-xl text-xs font-bold ${msg.includes("✓") ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}>
              {msg}
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="w-full sp-btn-primary py-3.5 font-display font-800 text-sm cursor-pointer shadow-lg disabled:opacity-50">
            {saving ? "Đang lưu hệ thống..." : "Lưu Thông Tin Cá Nhân & Ngân Hàng"}
          </button>
        </div>

        {/* NÚT ĐĂNG XUẤT */}
        <div className="pt-6 border-t border-white/5">
          <button 
            onClick={handleLogout} 
            className="w-full py-3.5 rounded-xl font-display font-800 text-xs transition-all cursor-pointer border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white"
          >
            Đăng Xuất Tài Khoản
          </button>
        </div>
      </div>
    </div>
  );
}