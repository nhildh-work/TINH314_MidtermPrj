import { useState } from "react";
import { useApp } from "../context";
import type { PendingDispute } from "../context";

export default function Dispute() {
  const { disputeTicket, closeDispute, nav, addPendingDispute, t } = useApp();
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Buyer Refund Bank Account fields (No strict name match needed)
  const [refundBankNum, setRefundBankNum] = useState("");
  const [refundBankName, setRefundBankName] = useState("MB Bank");
  const [refundBankHolder, setRefundBankHolder] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);

  const canSubmit = reason && videoFile && refundBankNum.trim() && refundBankHolder.trim();

  const handleSubmit = () => {
    setRefundError(null);
    if (!reason || !videoFile) {
      setRefundError("Vui lòng chọn loại sự cố và tải lên video bằng chứng!");
      return;
    }

    if (!refundBankNum.trim() || !refundBankName.trim() || !refundBankHolder.trim()) {
      setRefundError("Vui lòng điền đầy đủ số tài khoản, tên ngân hàng và tên chủ tài khoản nhận bồi hoàn.");
      return;
    }

    if (!disputeTicket) return;

    const now = new Date();
    const ts = `${now.getDate().toString().padStart(2,"0")}/${(now.getMonth()+1).toString().padStart(2,"0")}/${now.getFullYear()} · ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    
    const d: PendingDispute = {
      id: `D-${Date.now()}`,
      ticketTitle: disputeTicket.eventTitle,
      tier: disputeTicket.tier,
      amount: disputeTicket.price,
      buyerReason: reason,
      buyerDetail: detail,
      buyerVideo: videoFile!.name,
      buyerSubmittedAt: ts,
      refundBankNum: refundBankNum.trim(),
      refundBankName: refundBankName.trim(),
      refundBankHolder: refundBankHolder.trim().toUpperCase(),
    };

    addPendingDispute(d);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🛡️</div>
        <h2 className="font-display font-800 text-white text-xl mb-2">{t.reportSentTitle}</h2>
        <p className="text-sm mb-3 leading-relaxed text-gray-300">
          Hệ thống SafePass đã phong tỏa <strong className="text-amber-400">100% dòng tiền giao dịch</strong> và chuyển hồ sơ vào quy trình Fast-Track Escrow.
        </p>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 mb-6 text-left space-y-1 max-w-md mx-auto">
          <p>• <strong>Tài khoản nhận hoàn tiền:</strong> {refundBankName} - {refundBankNum} ({refundBankHolder})</p>
          <p>• <strong>Thời gian xử lý:</strong> Phán quyết sơ thẩm trong 15-30 phút (nếu sát giờ) hoặc tối đa 02 giờ đối chất.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { closeDispute(); nav("dispute-center"); }} className="sp-btn-primary px-6 py-2.5 font-display font-700 cursor-pointer">
            Theo dõi tại Trung tâm Tranh Chấp
          </button>
          <button onClick={() => { closeDispute(); nav("my-tickets"); }} className="sp-btn-ghost px-6 py-2.5 font-display font-700 cursor-pointer">
            Về danh sách vé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-8">
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => { closeDispute(); nav("my-tickets"); }} className="sp-btn-ghost text-xs px-3 py-1.5 mt-0.5 cursor-pointer">
          ← Quay lại
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-800 text-white text-xl">{t.reportPageTitle || "Khiếu Nại Sự Cố Cổng Vé (Escrow Protection)"}</h1>
            <span className="text-xs font-display font-700 px-2.5 py-0.5 rounded-full" style={{ color: "#F87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
              FAST-TRACK ESCROW
            </span>
          </div>
          {disputeTicket && (
            <p className="text-sm mt-0.5 text-gray-400">
              {disputeTicket.eventTitle} · {disputeTicket.tier}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-500/10 border border-red-500/25">
        <span className="text-xl shrink-0">🛡️</span>
        <div>
          <p className="text-sm font-700 text-red-400 mb-1">Cơ chế Bảo vệ Tiền Ký Quỹ Người Mua</p>
          <p className="text-xs leading-relaxed text-gray-300">
            Khi gửi khiếu nại, dòng tiền người mua và 25% tiền cọc của người bán sẽ lập tức bị đóng băng để bảo đảm quyền lợi hoàn tiền 100% cho bạn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Incident details */}
        <div className="sp-card p-5 space-y-4">
          <h2 className="font-display font-700 text-white text-base">1. Chi tiết sự cố tại cổng soát vé</h2>

          <div>
            <label className="sp-filter-label mb-2 block">Loại sự cố *</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="sp-select">
              <option value="">Chọn loại sự cố</option>
              <option value="Vé bị báo đã quét trước đó">Vé bị báo đã quét trước đó (Trùng mã)</option>
              <option value="Mã QR không hợp lệ / Vé giả mạo">Mã QR không hợp lệ / Vé giả mạo</option>
              <option value="Sai vị trí chỗ ngồi / Bị hủy vé">Sai vị trí chỗ ngồi / Bị hủy vé</option>
              <option value="Sự cố kỹ thuật khác tại cổng">Sự cố kỹ thuật khác tại cổng</option>
            </select>
          </div>

          <div>
            <label className="sp-filter-label mb-2 block">Mô tả chi tiết sự cố tại cổng vé</label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={5}
              className="sp-input"
              placeholder="Hãy nêu rõ thời gian bạn đến cổng, nhân viên soát vé báo lỗi gì..."
            />
          </div>
        </div>

        {/* Video proof */}
        <div className="sp-card p-5 space-y-4">
          <h2 className="font-display font-700 text-white text-base">2. Bằng chứng video thực tế tại cổng</h2>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs font-700 text-amber-400 mb-1">Yêu cầu bắt buộc về video bằng chứng:</p>
            <p className="text-xs leading-relaxed text-gray-300">
              Quay rõ <strong>màn hình máy quét của nhân viên báo lỗi</strong> hoặc nhân viên soát vé từ chối cho vào.
            </p>
          </div>

          <div>
            <label className="sp-filter-label mb-2 block">Tải lên video bằng chứng (MP4, MOV) *</label>
            <label className="block cursor-pointer">
              <div
                className="h-36 rounded-xl flex flex-col items-center justify-center transition-all p-3"
                style={{
                  border: videoFile ? "2px solid rgba(163,230,53,0.5)" : "2px dashed rgba(248,113,113,0.35)",
                  background: "#0a0a14",
                }}
              >
                {videoFile ? (
                  <div className="text-center">
                    <p className="text-3xl mb-1.5">✅</p>
                    <p className="text-sm font-display font-700 text-lime-400 px-3 text-center line-clamp-1">{videoFile.name}</p>
                    <p className="text-xs mt-1 text-gray-400">Nhấp để đổi video khác</p>
                  </div>
                ) : (
                  <>
                    <span className="text-3xl mb-2">🎥</span>
                    <p className="text-sm font-600 text-white">Nhấp để tải lên video bằng chứng</p>
                    <p className="text-xs mt-1 text-gray-500">Định dạng MP4 / MOV / AVI (tối đa 100MB)</p>
                  </>
                )}
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && setVideoFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>

      {/* Buyer Refund Bank Account Form (No name match constraint) */}
      <div className="sp-card p-5 mb-5">
        <div className="pb-3 border-b border-white/5 mb-4">
          <h2 className="font-display font-700 text-white text-base flex items-center gap-2">
            <span>💳</span>
            <span>3. Thông tin Tài Khoản Ngân Hàng Nhận Tiền Bồi Hoàn (100% Hoàn Tiền)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Người mua có thể điền tài khoản cá nhân hoặc tài khoản người thân để nhận tiền bồi hoàn khi khiếu nại được duyệt.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="sp-filter-label mb-1.5 block">Ngân hàng nhận bồi hoàn *</label>
            <select value={refundBankName} onChange={e => setRefundBankName(e.target.value)} className="sp-select">
              <option value="MB Bank">MB Bank (Quân Đội)</option>
              <option value="Vietcombank">Vietcombank</option>
              <option value="Techcombank">Techcombank</option>
              <option value="BIDV">BIDV</option>
              <option value="VPBank">VPBank</option>
              <option value="ACB">ACB</option>
              <option value="TPBank">TPBank</option>
            </select>
          </div>

          <div>
            <label className="sp-filter-label mb-1.5 block">Số tài khoản nhận hoàn tiền *</label>
            <input
              value={refundBankNum}
              onChange={e => setRefundBankNum(e.target.value)}
              className="sp-input font-mono"
              placeholder="Nhập số tài khoản"
            />
          </div>

          <div>
            <label className="sp-filter-label mb-1.5 block">Tên chủ tài khoản nhận hoàn tiền *</label>
            <input
              value={refundBankHolder}
              onChange={e => setRefundBankHolder(e.target.value)}
              className="sp-input uppercase font-bold tracking-wide"
              placeholder="VD: NGUYEN VAN A"
            />
          </div>
        </div>
      </div>

      {refundError && (
        <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300 mb-4 leading-relaxed">
          ⚠️ {refundError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3.5 rounded-xl font-display font-700 text-white text-sm transition-all hover:opacity-90 disabled:opacity-35 cursor-pointer"
        style={{ background: "linear-gradient(135deg,#991B1B,#DC2626)" }}
      >
        Gửi Báo Cáo & Yêu Cầu Hoàn Tiền 100% →
      </button>
    </div>
  );
}
