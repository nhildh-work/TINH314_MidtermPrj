import { useState, useEffect } from "react";
import { useApp } from "../context";
import { type MyListing } from "../data";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

function normalizeName(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const BANK_BINS: Record<string, string> = {
  "MB": "970422",
  "MB Bank": "970422",
  "VCB": "970436",
  "Vietcombank": "970436",
  "TCB": "970407",
  "Techcombank": "970407",
  "BIDV": "970418",
  "VPB": "970432",
  "VPBank": "970432",
  "ACB": "970416",
  "TPB": "970423",
  "TPBank": "970423",
  "CTG": "970415",
  "Vietinbank": "970415",
};

const STATUS_CFG = {
  available: { label: "ĐANG BÁN", color: "#A3E635", bg: "rgba(163,230,53,0.1)" },
  locked:    { label: "ĐANG GIAO DỊCH", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  completed: { label: "ĐÃ BÁN THÀNH CÔNG", color: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  disputed:  { label: "🚨 TRANH CHẤP (ĐÃ KHÓA TIỀN VÉ NÀY)", color: "#F87171", bg: "rgba(248,113,113,0.15)" },
} as const;

function WithdrawModal({ balance, onClose }: { balance: number; onClose: () => void }) {
  const { currentProfile, refreshProfile } = useApp();
  const [bank, setBank] = useState(currentProfile?.bank_name || "MB Bank");
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

    const registeredName = normalizeName(currentProfile?.full_name || "");
    const inputHolder = normalizeName(accountName);

    if (registeredName && inputHolder !== registeredName) {
      setBankError(
        `Tên chủ tài khoản ngân hàng ("${accountName}") phải trùng khớp tuyệt đối với họ tên trên CCCD đã xác thực ("${currentProfile?.full_name}")!`
      );
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
          bank_account: accountNum,
          bank_holder: accountName,
        }).eq("id", currentProfile.id);
        await refreshProfile();
      } catch (e) {
        console.warn("Notice updating seller bank:", e);
      }
    }

    setConfirmed(true);
  };

  if (confirmed) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
      <div className="sp-card p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="font-display font-800 text-white text-xl mb-1">Yêu cầu rút tiền đã được gửi!</h2>
        <p className="text-sm mb-5 text-gray-300">
          Số tiền <strong className="text-emerald-400">{fmt(numAmount)}</strong> sẽ được giải ngân vào tài khoản chính chủ {bank} ({accountNum} - {accountName}) của bạn trong vòng 1-2 giờ làm việc.
        </p>
        <button onClick={onClose} className="sp-btn-primary w-full py-3 font-display font-700 cursor-pointer">
          Đóng
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }} onClick={onClose}>
      <div className="sp-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div>
            <h2 className="font-display font-800 text-white text-lg">Rút Tiền Về Ngân Hàng</h2>
            <p className="text-[11px] text-purple-400">Yêu cầu tên chủ TK trùng khớp với CCCD</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {isZero ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">💰</div>
            <p className="font-display font-700 text-white text-base mb-1">Số dư khả dụng: 0 VND</p>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Bạn chưa có vé nào hoàn tất giao dịch. Khi có người mua vé và hoàn tất sự kiện, tiền vé (95%) cùng 100% tiền cọc ký quỹ (25%) sẽ tự động chuyển vào số dư khả dụng để bạn rút về tài khoản.
            </p>
            <button onClick={onClose} className="sp-btn-ghost px-6 py-2.5 font-display font-700 cursor-pointer">
              Đã hiểu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex justify-between items-center text-xs">
              <span className="text-gray-300">Số dư khả dụng có thể rút:</span>
              <span className="font-display font-800 text-emerald-400 text-sm">{fmt(balance)}</span>
            </div>

            <div>
              <label className="sp-filter-label mb-1.5 block">Ngân hàng thụ hưởng *</label>
              <select value={bank} onChange={e => setBank(e.target.value)} className="sp-select">
                <option value="MB Bank">MB Bank (Quân Đội)</option>
                <option value="Vietcombank">Vietcombank</option>
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="sp-filter-label">Tên chủ tài khoản (Khớp 100% CCCD) *</label>
                <span className="text-[10px] text-amber-400 font-semibold">🔒 Bắt buộc trùng CCCD</span>
              </div>
              <input
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                className="sp-input uppercase font-bold tracking-wide"
                placeholder={currentProfile?.full_name || "NGUYEN DINH NGUYEN"}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Tên đăng ký trên CCCD: <strong className="text-gray-300">{currentProfile?.full_name || "Chưa định danh"}</strong>
              </p>
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
              <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300 leading-relaxed">
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

function DetailModal({ listing, onClose, onDeleted }: { listing: MyListing; onClose: () => void; onDeleted: (id: number) => void }) {
  const cfg = STATUS_CFG[listing.status] || STATUS_CFG.available;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeleteListing = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy và xóa niêm yết vé này không?")) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await supabase.from("transactions").delete().eq("ticket_id", listing.id);

      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", listing.id);

      if (error) throw error;

      onDeleted(listing.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể hủy và xóa niêm yết vé.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="sp-card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display font-700 text-white text-sm leading-snug pr-4">{listing.eventTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Hạng vé</span>
            <span className="font-display font-700 text-sm text-purple-400">{listing.tier}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Thời gian</span>
            <span className="font-display font-700 text-sm text-gray-300">{listing.date}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Giá niêm yết</span>
            <span className="font-display font-700 text-sm text-white">{fmt(listing.price)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="sp-filter-label">Trạng thái</span>
            <span className="text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
            ⚠ {errorMsg}
          </div>
        )}

        {listing.status === "available" ? (
          <button
            onClick={handleDeleteListing}
            disabled={loading}
            className="w-full py-3 rounded-xl font-display font-700 text-sm transition-all cursor-pointer disabled:opacity-50"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#F87171" }}
          >
            {loading ? "Đang xử lý..." : "Hủy và xóa niêm yết vé"}
          </button>
        ) : (
          <p className="text-xs text-center text-gray-400">
            {listing.status === "locked" ? "Vé đang được giao dịch (Tạm khóa, không thể hủy)." : "Vé đã bán hoặc bị khiếu nại, không thể hủy."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SellerDash() {
  const { nav, kycStatus, currentProfile, currentUser, refreshProfile, t } = useApp();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [detailListing, setDetailListing] = useState<MyListing | null>(null);
  const [sellerTickets, setSellerTickets] = useState<MyListing[]>([]);
  const [sellerDisputes, setSellerDisputes] = useState<any[]>([]);

  const [bankCode, setBankCode] = useState(currentProfile?.bank_name || "MB Bank");
  const [accountNumber, setAccountNumber] = useState(currentProfile?.bank_account || "");
  
  const [fetchedHolder, setFetchedHolder] = useState<string>("");
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const uid = currentUser?.id;
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
            // Đóng băng ĐỘC LẬP vé bị disputed, vé completed khác vẫn hoàn toàn bình thường
            status: t.status === "disputed" ? "disputed" : t.status === "sold" ? "completed" : t.status === "locked" ? "locked" : "available",
            date: t.event_date || "Sắp diễn ra",
          }));
          setSellerTickets(mapped);
        }

        const { data: disData } = await supabase
          .from("disputes")
          .select("*, tickets(*)")
          .eq("seller_id", uid);

        if (disData) setSellerDisputes(disData);
      } catch (err) {
        console.error("Lỗi khi tải vé người bán từ Supabase:", err);
      }
    }

    loadSellerTickets();

    const channel = supabase
      .channel("seller_realtime_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          loadSellerTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentProfile) {
      if (currentProfile.bank_name) setBankCode(currentProfile.bank_name);
      if (currentProfile.bank_account) setAccountNumber(currentProfile.bank_account);
    }
  }, [currentProfile]);

  useEffect(() => {
    const trimmedAcc = accountNumber.trim();
    if (!trimmedAcc || trimmedAcc.length < 6) {
      setFetchedHolder("");
      setErrorMsg(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      setErrorMsg(null);
      setFetchedHolder("");

      try {
        let name = "";
        try {
          const { data } = await supabase.functions.invoke("lookup-bank", {
            body: { bankCode, accountNumber: trimmedAcc },
          });
          if (data?.success && data?.data?.accountName) {
            name = data.data.accountName;
          }
        } catch (fnErr) {
          console.warn("Edge function lookup notice:", fnErr);
        }

        if (!name) {
          try {
            const bin = BANK_BINS[bankCode] || "970422";
            const res = await fetch("https://api.vietqr.io/v2/lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bin, accountNumber: trimmedAcc }),
            });
            const json = await res.json();
            if (json?.data?.accountName) {
              name = json.data.accountName;
            }
          } catch (apiErr) {
            console.warn("VietQR lookup notice:", apiErr);
          }
        }

        if (!name) {
          setErrorMsg("Không thể tra cứu thông tin từ ngân hàng. Vui lòng kiểm tra lại số tài khoản!");
          setFetchedHolder("");
          return;
        }

        const upperName = name.toUpperCase().trim();
        setFetchedHolder(upperName);

        const registeredName = (currentProfile?.full_name || "").toUpperCase().trim();
        const normReg = normalizeName(registeredName);
        const normHolder = normalizeName(upperName);

        if (normReg && normHolder && normHolder !== normReg) {
          setErrorMsg(`Tên chủ tài khoản ngân hàng thực tế ("${upperName}") KHÔNG KHỚP với tên trên CCCD ("${registeredName}"). Chống mạo danh tuyệt đối!`);
        }
      } catch (err) {
        setErrorMsg("Lỗi kết nối tra cứu ngân hàng. Vui lòng thử lại.");
      } finally {
        setIsLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [accountNumber, bankCode, currentProfile?.full_name]);

  const handleVerifyAndSaveBank = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const registeredName = (currentProfile?.full_name || "").toUpperCase().trim();
    const normRegistered = normalizeName(registeredName);
    const normHolder = normalizeName(fetchedHolder);

    if (!fetchedHolder || normHolder !== normRegistered) {
      setErrorMsg("Tên chủ tài khoản bắt buộc phải khớp 100% với tên trên CCCD đã định danh để bảo mật chống scam!");
      return;
    }

    setLoading(true);
    try {
      setSuccessMsg(`✓ Xác thực thành công! Chủ tài khoản chính chủ: ${fetchedHolder}`);

      if (currentProfile?.id) {
        await supabase.from("profiles").update({
          bank_name: bankCode,
          bank_account: accountNumber.trim(),
          bank_holder: fetchedHolder,
        }).eq("id", currentProfile.id);
        await refreshProfile();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể lưu thông tin tài khoản ngân hàng.");
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
  // SỐ DƯ RÚT TIỀN: CHỈ CỘNG TIỀN VÉ THÀNH CÔNG ('completed'). CÁC VÉ 'disputed' BỊ KHÓA RIÊNG KHÔNG ẢNH HƯỞNG
  const soldListings = allSellerListings.filter(l => l.status === "completed");
  const availableBalance = soldListings.reduce((sum, l) => sum + Math.round(l.price * 0.95 + l.price * 0.25), 0);

  const STATS = [
    { label: "Tổng số vé niêm yết", value: String(allSellerListings.length), icon: "🎟️", color: "#8B5CF6" },
    { label: "Đang mở bán", value: String(activeCount), icon: "🟢", color: "#A3E635" },
    { label: "Số dư khả dụng để rút", value: fmt(availableBalance), icon: "💰", color: "#10B981" },
  ];

  const registeredName = (currentProfile?.full_name || "").toUpperCase().trim();
  const isNameMatched = fetchedHolder && normalizeName(fetchedHolder) === normalizeName(registeredName);

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

      {/* CẢNH BÁO TRANH CHẤP DÀNH CHO NGƯỜI BÁN */}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-white/5 mb-4">
          <div>
            <h2 className="font-display font-800 text-white text-base flex items-center gap-2">
              <span>🏦</span>
              <span>Xác Thực Tài Khoản Ngân Hàng Người Bán (Live Interbank Tracking)</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                ✓ Bắt buộc khớp 100% tên CCCD chống Scam
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Gõ số tài khoản để hệ thống tra cứu tên chủ tài khoản từ ngân hàng và so khớp tuyệt đối với CCCD đã định danh (<strong>{registeredName}</strong>).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="sp-filter-label mb-1.5 block">Ngân hàng thụ hưởng</label>
            <select value={bankCode} onChange={e => setBankCode(e.target.value)} className="sp-select">
              <option value="MB Bank">MB Bank (Quân Đội)</option>
              <option value="Vietcombank">Vietcombank</option>
              <option value="Techcombank">Techcombank</option>
              <option value="BIDV">BIDV</option>
              <option value="VPBank">VPBank</option>
              <option value="ACB">ACB</option>
              <option value="TPBank">TPBank</option>
              <option value="Vietinbank">Vietinbank</option>
            </select>
          </div>

          <div>
            <label className="sp-filter-label mb-1.5 block">Số tài khoản ngân hàng (Gõ để tra cứu)</label>
            <input
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              className="sp-input font-mono"
              placeholder="Nhập số tài khoản..."
            />
          </div>

          <div>
            <label className="sp-filter-label mb-1.5 block">Tên CCCD đã định danh (Khóa cố định)</label>
            <input
              type="text"
              value={registeredName}
              readOnly
              disabled
              className="sp-input uppercase font-bold tracking-wide cursor-not-allowed opacity-80"
            />
          </div>
        </div>

        {accountNumber.trim().length >= 6 && (
          <div className="mt-4 p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5">
                <span>🔍</span>
                <span>Tên chủ tài khoản tra cứu từ {bankCode}:</span>
              </span>
              <span className="font-display font-800 px-3 py-1 rounded-lg bg-gray-900 border border-gray-700 text-amber-300 uppercase">
                {isLookingUp ? "Đang tra cứu hệ thống..." : (fetchedHolder || "Chưa có kết quả tra cứu")}
              </span>
            </div>

            {fetchedHolder && !isLookingUp && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-800/60">
                <span className="text-gray-400">Kết quả so khớp với CCCD:</span>
                <span className={`font-bold ${isNameMatched ? "text-emerald-400" : "text-rose-400"}`}>
                  {isNameMatched ? "✓ TRÙNG KHỚP TUYỆT ĐỐI (Chính chủ)" : "❌ KHÔNG TRÙNG KHỚP (Chặn tài khoản mạo danh)"}
                </span>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl leading-relaxed">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-xl font-bold">
            {successMsg}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleVerifyAndSaveBank}
            disabled={loading || isLookingUp || !isNameMatched}
            className="sp-btn-primary px-6 py-2.5 font-display font-700 text-xs cursor-pointer shadow-lg disabled:opacity-40"
          >
            {loading ? "Đang lưu..." : "Kiểm tra và Lưu tài khoản"}
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
                  const cfg = STATUS_CFG[listing.status] || STATUS_CFG.available;
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
                        <span className="text-xs text-gray-500">Chi tiết →</span>
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