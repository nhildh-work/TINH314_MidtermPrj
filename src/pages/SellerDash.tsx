import { useState, useEffect } from "react";
import { useApp } from "../context";
import { type MyListing } from "../data";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

// BẢNG CẤU HÌNH TRẠNG THÁI CHUẨN (ĐÃ BỔ SUNG REFUNDED)
const STATUS_CFG = {
  pending_deposit: { label: "⏳ CHỜ ĐÓNG CỌC (25%)", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  available:       { label: "🟢 ĐANG MỞ BÁN", color: "#A3E635", bg: "rgba(163,230,53,0.1)" },
  sold:            { label: "🔒 ĐÃ BÁN (ĐÓNG BẰNG ESCROW)", color: "#FBBF24", bg: "rgba(251,191,36,0.15)" },
  locked:          { label: "🔒 ĐÃ BÁN (ĐÓNG BẰNG ESCROW)", color: "#FBBF24", bg: "rgba(251,191,36,0.15)" },
  completed:       { label: "✅ HOÀN THÀNH (ĐÃ GIẢI NGÂN)", color: "#34D399", bg: "rgba(52,211,153,0.15)" },
  disputed:        { label: "🚨 TRANH CHẤP (ĐÃ KHÓA TIỀN VÉ NÀY)", color: "#F87171", bg: "rgba(248,113,113,0.15)" },
  refunded:        { label: "❌ ĐÃ HOÀN TIỀN (NGƯỜI MUA THẮNG)", color: "#9CA3AF", bg: "rgba(156,163,175,0.15)" },
} as const;

// POPUP YÊU CẦU RÚT TIỀN
function WithdrawModal({ balance, onClose }: { balance: number; onClose: () => void }) {
  const { currentProfile, refreshProfile } = useApp();
  const [bank, setBank] = useState(currentProfile?.bank_name || "Vietcombank");
  const [accountNum, setAccountNum] = useState(currentProfile?.bank_account || "");
  const [accountName, setAccountName] = useState(currentProfile?.bank_holder || currentProfile?.full_name || "");
  const [amount, setAmount] = useState<string>(balance > 0 ? String(balance) : "0");
  const [bankError, setBankError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const numAmount = Number(amount) || 0;
  const isZero = balance <= 0;

  const handleConfirmWithdraw = async () => {
    setBankError(null);
    if (!accountNum.trim() || !bank.trim() || !accountName.trim()) {
      setBankError("Vui lòng điền đầy đủ thông tin tài khoản ngân hàng!");
      return;
    }

    if (numAmount <= 0 || numAmount > balance) {
      setBankError("Số tiền rút không hợp lệ hoặc vượt quá số dư khả dụng!");
      return;
    }

    if (currentProfile?.id) {
      try {
        await supabase.from("profiles").update({
          bank_name: bank,
          bank_account: accountNum.trim(),
          bank_holder: accountName.trim().toUpperCase(),
        }).eq("id", currentProfile.id);
        await refreshProfile();
      } catch (e) {
        console.warn("Lỗi lưu thông tin rút tiền:", e);
      }
    }

    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
        <div className="sp-card p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="font-display font-800 text-white text-xl">Yêu cầu rút tiền đã được gửi!</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Số tiền <strong className="text-emerald-400">{fmt(numAmount)}</strong> sẽ được chuyển vào tài khoản {bank} ({accountNum} - {accountName}) của bạn trong vòng 1-2 giờ làm việc.
          </p>
          <button onClick={onClose} className="sp-btn-primary w-full py-3 font-display font-700 cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }} onClick={onClose}>
      <div className="sp-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div>
            <h2 className="font-display font-800 text-white text-lg">Rút Tiền Về Ngân Hàng</h2>
            <p className="text-[11px] text-purple-400">Rút tiền trực tiếp từ số dư khả dụng</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {isZero ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">💰</div>
            <p className="font-display font-700 text-white text-base">Số dư khả dụng: 0 VND</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bạn chưa có vé nào hoàn tất giao dịch. Khi vé bán thành công và sự kiện diễn ra, tiền sẽ chuyển vào số dư để bạn rút.
            </p>
            <button onClick={onClose} className="sp-btn-ghost px-6 py-2.5 font-display font-700 cursor-pointer">
              Đã hiểu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex justify-between items-center text-xs">
              <span className="text-gray-300">Số dư có thể rút:</span>
              <span className="font-display font-800 text-emerald-400 text-sm">{fmt(balance)}</span>
            </div>

            <div>
              <label className="sp-filter-label mb-1.5 block">Ngân hàng thụ hưởng *</label>
              <select value={bank} onChange={e => setBank(e.target.value)} className="sp-select">
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
              <label className="sp-filter-label mb-1.5 block">Số tài khoản ngân hàng *</label>
              <input
                value={accountNum}
                onChange={e => setAccountNum(e.target.value)}
                className="sp-input font-mono"
                placeholder="Nhập số tài khoản"
              />
            </div>

            <div>
              <label className="sp-filter-label mb-1.5 block">Tên chủ tài khoản *</label>
              <input
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                className="sp-input uppercase font-bold tracking-wide"
                placeholder="Tên chủ tài khoản"
              />
            </div>

            <div>
              <label className="sp-filter-label mb-1.5 block">Số tiền muốn rút (VND)</label>
              <input
                type="number"
                value={amount}
                max={balance}
                onChange={e => setAmount(e.target.value)}
                className="sp-input font-display font-700 text-purple-300"
              />
            </div>

            {bankError && (
              <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                ⚠️ {bankError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 sp-btn-ghost py-3 font-display font-700 cursor-pointer">
                Hủy
              </button>
              <button
                onClick={handleConfirmWithdraw}
                disabled={numAmount <= 0 || numAmount > balance}
                className="flex-1 sp-btn-primary py-3 font-display font-700 text-sm cursor-pointer disabled:opacity-40"
              >
                Xác nhận rút {fmt(numAmount)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// POPUP CHI TIẾT VÉ & NÚT ĐÓNG CỌC MỞ BÁN
function DetailModal({ listing, onClose, onDeleted }: { listing: MyListing; onClose: () => void; onDeleted: (id: number) => void }) {
  const { openCheckout, currentProfile, refreshProfile } = useApp();
  const cfg = STATUS_CFG[listing.status as keyof typeof STATUS_CFG] || STATUS_CFG.available;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const depositAmount = Math.round(listing.price * 0.25);
  const cancellationFee = Math.round(depositAmount * 0.05);
  const refundAmount = depositAmount - cancellationFee;

  const handleDeleteListing = async () => {
    if (listing.status === "locked" || listing.status === "disputed") {
      alert("🔴 Vé đang trong quá trình giao dịch với người mua hoặc tranh chấp, tuyệt đối KHÔNG ĐƯỢC HỦY!");
      return;
    }

    const isAvailable = listing.status === "available";
    const confirmMsg = isAvailable
      ? `XÁC NHẬN HỦY NIÊM YẾT VÉ?\n\n• Giá vé niêm yết: ${fmt(listing.price)}\n• Tiền cọc đã đóng (25%): ${fmt(depositAmount)}\n• Phí dịch vụ hủy hệ thống (5%): -${fmt(cancellationFee)}\n• Số tiền cọc hoàn vào Số dư tài khoản: +${fmt(refundAmount)}\n\nBạn có chắc chắn muốn hủy niêm yết vé này không?`
      : "Bạn có chắc chắn muốn hủy đăng bán vé này không?";

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      await supabase.from("transactions").delete().eq("ticket_id", listing.id);
      const { error } = await supabase.from("tickets").delete().eq("id", listing.id);
      if (error) throw error;

      if (isAvailable && refundAmount > 0 && currentProfile?.id) {
        const currentBal = Number((currentProfile as any).balance || 0);
        await supabase
          .from("profiles")
          .update({ balance: currentBal + refundAmount })
          .eq("id", currentProfile.id);

        await refreshProfile();
      }

      onDeleted(listing.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể hủy niêm yết vé.");
      setLoading(false);
    }
  };

  const handlePayDepositNow = () => {
    onClose();
    openCheckout({
      id: listing.id,
      eventId: 0,
      eventTitle: listing.eventTitle,
      eventImage: "",
      eventDate: listing.date,
      city: "",
      tier: `Cọc ký quỹ (25%): ${listing.tier}`,
      tierColor: "#A78BFA",
      section: "",
      seat: "",
      price: depositAmount,
      officialPrice: listing.price,
      sellerName: "",
      sellerScore: 5.0,
      sellerReviews: 0,
      verified: true,
      venue: "SafePass Escrow System",
      isDeposit: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="sp-card p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display font-700 text-white text-sm leading-snug pr-4">{listing.eventTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Hạng vé</span>
            <span className="font-display font-700 text-purple-400">{listing.tier}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Thời gian</span>
            <span className="font-display font-700 text-gray-300">{listing.date}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Giá niêm yết</span>
            <span className="font-display font-700 text-white">{fmt(listing.price)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Trạng thái</span>
            <span className="text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
            ⚠ {errorMsg}
          </div>
        )}

        {listing.status === "pending_deposit" ? (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
              ⚠️ Vé này chưa hoàn tất đóng cọc ký quỹ (25%). Vui lòng chuyển khoản cọc để chính thức đăng bán vé lên hệ thống!
            </div>
            <button
              onClick={handlePayDepositNow}
              className="w-full py-3.5 rounded-xl font-display font-800 text-xs cursor-pointer shadow-lg bg-amber-500 hover:bg-amber-400 text-black transition-all"
            >
              ⚡ Thanh toán cọc ngay ({fmt(depositAmount)}) →
            </button>
            <button
              onClick={handleDeleteListing}
              disabled={loading}
              className="w-full py-2 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all cursor-pointer"
            >
              Hủy đăng vé này
            </button>
          </div>
        ) : listing.status === "available" ? (
          <button
            onClick={handleDeleteListing}
            disabled={loading}
            className="w-full py-3 rounded-xl font-display font-700 text-xs transition-all cursor-pointer disabled:opacity-50"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#F87171" }}
          >
            {loading ? "Đang xử lý..." : "Hủy và xóa niêm yết vé"}
          </button>
        ) : (
          <p className="text-xs text-center text-gray-400">
            {listing.status === "locked" ? "Vé đang giao dịch, không thể hủy." : "Vé đã xử lý xong hoặc đang tranh chấp."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SellerDash() {
  const { nav, kycStatus, currentProfile, currentUser, refreshProfile, t, openCheckout } = useApp();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [detailListing, setDetailListing] = useState<MyListing | null>(null);
  const [sellerTickets, setSellerTickets] = useState<MyListing[]>([]);
  const [sellerDisputes, setSellerDisputes] = useState<any[]>([]);

  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile) {
      setPhone(currentProfile.phone || currentUser?.phone || "");
      setBankName(currentProfile.bank_name || "Vietcombank");
      setAccountNumber(currentProfile.bank_account || "");
      setAccountHolder(currentProfile.bank_holder || currentProfile.full_name || "");
    }
  }, [currentProfile, currentUser]);

  useEffect(() => {
    const uid = currentUser?.id || currentProfile?.id;
    if (!uid) return;

    async function loadSellerTickets() {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("seller_id", uid)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped: MyListing[] = data.map((t: any) => ({
            id: Number(t.id),
            eventTitle: t.event_name,
            tier: t.tier || "Standard",
            price: Number(t.price),
            status: t.status === "pending_deposit"
              ? "pending_deposit"
              : t.status === "disputed"
              ? "disputed"
              : t.status === "completed"
              ? "completed"
              : t.status === "refunded"
              ? "refunded"
              : t.status === "sold" || t.status === "locked"
              ? "locked"
              : "available",
            date: t.event_date || "Sắp diễn ra",
          }));
          setSellerTickets(mapped);
        }

        const { data: disData } = await supabase
          .from("disputes")
          .select("*, tickets(*)")
          .order("created_at", { ascending: false });

        if (disData) {
          const sellerDisputesFiltered = disData.filter((d: any) =>
            String(d.seller_id) === String(uid) || String(d.tickets?.seller_id) === String(uid)
          );
          setSellerDisputes(sellerDisputesFiltered);
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu người bán:", err);
      }
    }

    loadSellerTickets();

    const channel = supabase
      .channel("seller_realtime_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        loadSellerTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentProfile?.id]);

  const handleSaveBankInfo = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!accountNumber.trim() || !phone.trim() || !accountHolder.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ Số điện thoại, Số tài khoản và Tên chủ tài khoản!");
      return;
    }

    setLoading(true);
    try {
      const holderName = accountHolder.trim().toUpperCase() || (currentProfile?.full_name || "").toUpperCase();

      if (currentProfile?.id) {
        await supabase.from("profiles").update({
          phone: phone.trim(),
          bank_name: bankName,
          bank_account: accountNumber.trim(),
          bank_holder: holderName,
        }).eq("id", currentProfile.id);
      }

      await supabase.auth.updateUser({
        data: {
          phone: phone.trim(),
          bank_name: bankName,
          bank_account: accountNumber.trim(),
          bank_holder: holderName,
        }
      });

      await refreshProfile();
      setSuccessMsg("✓ Đã lưu và đồng bộ Thông Tin Liên Hệ & Tài Khoản Ngân Hàng thành công!");
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi lưu thông tin.");
    } finally {
      setLoading(false);
    }
  };

  const allSellerListings = sellerTickets;

  const isKycApproved =
    kycStatus === "approved" ||
    currentProfile?.kyc_status === "approved" ||
    currentProfile?.is_verified === true ||
    currentProfile?.role === "seller";

  if (!isKycApproved) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl"
          style={{ background: "rgba(139,92,246,0.1)", border: "2px solid rgba(139,92,246,0.2)" }}>
          🔐
        </div>
        <h2 className="font-display font-800 text-white text-2xl mb-2">{t.kycRequired}</h2>
        <p className="text-sm mb-2 max-w-xs mx-auto leading-relaxed" style={{ color: "#9ca3af" }}>{t.kycSub}</p>
        <p className="text-xs mb-6" style={{ color: "#4b5563" }}>{t.kycNote}</p>
        <button onClick={() => nav("kyc")} className="sp-btn-primary px-8 py-3 font-display font-700 cursor-pointer">
          {t.kycStart}
        </button>
      </div>
    );
  }

  const activeCount = allSellerListings.filter(l => l.status === "available").length;
  const pendingSoldListings = allSellerListings.filter(l => l.status === "locked");
  const frozenEscrowBalance = pendingSoldListings.reduce((sum, l) => sum + Math.round(l.price * 0.95 + l.price * 0.25), 0);

  const completedListings = allSellerListings.filter(l => l.status === "completed");
  const completedBalance = completedListings.reduce((sum, l) => sum + Math.round(l.price * 0.95 + l.price * 0.25), 0);

  const availableBalance = Number((currentProfile as any)?.balance || 0) + completedBalance;

  const STATS = [
    { label: "Tổng số vé niêm yết", value: String(allSellerListings.length), icon: "🎟️", color: "#8B5CF6" },
    { label: "Đang mở bán", value: String(activeCount), icon: "🟢", color: "#A3E635" },
    { label: "Tiền đang đóng băng Escrow", value: fmt(frozenEscrowBalance), icon: "🔒", color: "#FBBF24" },
    { label: "Số dư khả dụng để rút", value: fmt(availableBalance), icon: "💰", color: "#10B981" },
  ];

  return (
    <div className="max-w-[1680px] mx-auto px-5 lg:px-8 py-8">
      {showWithdraw && <WithdrawModal balance={availableBalance} onClose={() => setShowWithdraw(false)} />}
      {detailListing && (
        <DetailModal 
          listing={detailListing} 
          onClose={() => setDetailListing(null)} 
          onDeleted={(deletedId) => setSellerTickets(prev => prev.filter(item => item.id !== deletedId))}
        />
      )}

      {sellerDisputes.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="font-display font-800 text-red-400 text-sm">
                CẢNH BÁO TRANH CHẤP KHẨN CẤP ({sellerDisputes.length} đơn)
              </h3>
              <p className="text-xs text-gray-300">
                Khoản thanh toán của vé bị khiếu nại đang bị đóng băng độc lập. Các vé thành công khác vẫn rút tiền bình thường.
              </p>
            </div>
          </div>
          <button
            onClick={() => nav("dispute-center")}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-display font-700 text-xs rounded-xl transition-all cursor-pointer"
          >
            Vào Trung tâm tranh chấp →
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="font-display font-800 text-white text-2xl">{t.sellerDashTitle}</h1>
          <p className="text-sm mt-0.5 text-gray-400">{t.sellerDashSub}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => nav("dispute-center")} className="sp-btn-ghost px-4 py-2.5 font-display font-700 text-sm cursor-pointer"
            style={{ borderColor: "rgba(248,113,113,0.25)", color: "#F87171" }}>
            Trung tâm tranh chấp
          </button>
          <button onClick={() => nav("new-listing")} className="sp-btn-primary px-5 py-2.5 font-display font-700 cursor-pointer">
            + Đăng bán vé mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="sp-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: s.color + "1a" }}>
                {s.icon}
              </div>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
            <p className="font-display font-800 text-white text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="sp-card p-6 mb-6">
        <div className="pb-4 border-b border-white/5 mb-4">
          <h2 className="font-display font-800 text-white text-base flex items-center gap-2">
            <span>🏦</span>
            <span>Thông Tin Liên Hệ & Tài Khoản Nhận Tiền</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Số điện thoại liên hệ và tài khoản ngân hàng để hệ thống SafePass tự động giải ngân hoặc hoàn cọc.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="sp-filter-label mb-1.5 block">Số điện thoại liên hệ *</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="sp-input font-mono"
              placeholder="Nhập số điện thoại..."
            />
          </div>
          <div>
            <label className="sp-filter-label mb-1.5 block">Ngân hàng thụ hưởng *</label>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="sp-filter-label mb-1.5 block">Số tài khoản ngân hàng *</label>
            <input
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              className="sp-input font-mono"
              placeholder="Nhập số tài khoản ngân hàng..."
            />
          </div>
          <div>
            <label className="sp-filter-label mb-1.5 block">Tên chủ tài khoản (Khớp với CCCD) *</label>
            <input
              type="text"
              value={accountHolder}
              onChange={e => setAccountHolder(e.target.value)}
              className="sp-input uppercase font-bold tracking-wide"
              placeholder="Nhập tên chủ tài khoản..."
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-bold">
            {successMsg}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveBankInfo}
            disabled={loading}
            className="sp-btn-primary px-6 py-2.5 font-display font-700 text-xs cursor-pointer shadow-lg disabled:opacity-40"
          >
            {loading ? "Đang lưu..." : "Lưu & Đồng Bộ Thông Tin"}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-sm text-gray-200">
              Chính sách đối soát: <strong className="text-blue-400">Thứ Sáu hàng tuần</strong> hoặc rút trực tiếp khi sự kiện hoàn tất. Phí nền tảng <strong className="text-purple-400">5%</strong>.
            </p>
            <p className="text-xs text-gray-400">
              Tiền cọc ký quỹ 25% được hoàn trả 100% khi giao dịch không có khiếu nại.
            </p>
          </div>
        </div>
        <button onClick={() => setShowWithdraw(true)} className="sp-btn-primary text-xs px-5 py-2.5 font-display font-700 shrink-0 cursor-pointer">
          Rút tiền về ngân hàng
        </button>
      </div>

      <div className="sp-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="font-display font-700 text-white text-sm">Danh Sách Vé Đã Đăng Bán</h2>
          <span className="text-xs font-display font-600 text-gray-400">{allSellerListings.length} vé</span>
        </div>
        <div className="overflow-x-auto">
          {allSellerListings.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              Bạn chưa có vé nào được đăng bán. Bấm nút <strong>"+ Đăng bán vé mới"</strong> để bắt đầu.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", display: "table-row" }}>
                  {["SỰ KIỆN", "HẠNG VÉ", "GIÁ NIÊM YẾT", "THỜI GIAN", "TRẠNG THÁI", ""].map(h => (
                    <th key={h} className="sp-filter-label" style={{ textAlign: "left", padding: "12px 20px", display: "table-cell" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allSellerListings.map(listing => {
                  const cfg = STATUS_CFG[listing.status as keyof typeof STATUS_CFG] || STATUS_CFG.available;
                  return (
                    <tr
                      key={listing.id}
                      onClick={() => setDetailListing(listing)}
                      className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", display: "table-row" }}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <p className="font-display font-700 text-white text-sm truncate">{listing.eventTitle}</p>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span className="font-display font-600 text-xs text-purple-400">{listing.tier}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span className="font-display font-800 text-white text-sm">{fmt(listing.price)}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span className="text-xs text-gray-400">{listing.date}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          className="text-xs font-display font-700 px-2.5 py-0.5 rounded-full inline-block"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        {listing.status === "pending_deposit" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCheckout({
                                  id: listing.id,
                                  eventId: 0,
                                  eventTitle: listing.eventTitle,
                                  eventImage: "",
                                  eventDate: listing.date,
                                  city: "",
                                  tier: `Cọc ký quỹ (25%): ${listing.tier}`,
                                  tierColor: "#A78BFA",
                                  section: "",
                                  seat: "",
                                  price: Math.round(listing.price * 0.25),
                                  officialPrice: listing.price,
                                  sellerName: "",
                                  sellerScore: 5.0,
                                  sellerReviews: 0,
                                  verified: true,
                                  venue: "SafePass Escrow System",
                                  isDeposit: true,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg font-display font-800 text-[11px] bg-amber-500 hover:bg-amber-400 text-black shadow-md cursor-pointer transition-all"
                            >
                              ⚡ Đóng cọc ngay
                            </button>
                            <span className="text-xs text-gray-500">Chi tiết →</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Chi tiết →</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}