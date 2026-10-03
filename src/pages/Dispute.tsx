import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

async function sendGmailNotification(toEmail: string, subject: string, bodyText: string) {
  try {
    await supabase.functions.invoke("send-dispute-email", {
      body: { to: toEmail, subject, text: bodyText },
    });
  } catch (e) {
    console.warn("Notice sending Gmail notification:", e);
  }
}

export default function Dispute() {
  const { disputeTicket, closeDispute, nav, currentUser } = useApp();
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [refundBankNum, setRefundBankNum] = useState("");
  const [refundBankName, setRefundBankName] = useState("MB Bank");
  const [refundBankHolder, setRefundBankHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !videoFile || !refundBankNum.trim() || !refundBankHolder.trim() || !disputeTicket || !currentUser) return;

    try {
      setLoading(true);

      // TỰ ĐỘNG TÌM SELLER_ID NẾU CHƯA CÓ TRONG TICKET OBJECT
      let targetSellerId = (disputeTicket as any).seller_id || (disputeTicket as any).sellerId;
      if (!targetSellerId && disputeTicket.id) {
        const { data: tk } = await supabase
          .from("tickets")
          .select("seller_id")
          .eq("id", disputeTicket.id)
          .maybeSingle();
        if (tk?.seller_id) targetSellerId = tk.seller_id;
      }

      // 1. Lưu hồ sơ khiếu nại lên Supabase (Gửi chuẩn các cột riêng)
      const { error } = await supabase
        .from("disputes")
        .insert({
          ticket_id: disputeTicket.id,
          buyer_id: currentUser.id,
          seller_id: targetSellerId || null,
          reason: reason,
          description: detail.trim() || reason,
          video_url: videoFile ? videoFile.name : null,
          refund_bank_name: refundBankName.trim(),
          refund_bank_account: refundBankNum.trim(),
          refund_account_holder: refundBankHolder.trim().toUpperCase(),
          status: "pending_seller",
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // 2. Chuyển trạng thái vé sang 'disputed' để đóng băng KHOẢN THANH TOÁN VÉ NÀY
      await supabase
        .from("tickets")
        .update({ status: "disputed" })
        .eq("id", disputeTicket.id);

      // 3. Bắn Gmail thông báo cho Người mua
      if (currentUser.email) {
        sendGmailNotification(
          currentUser.email,
          "🛡️ SafePass Escrow: Đã tiếp nhận khiếu nại vé #" + disputeTicket.id,
          `Chào bạn, khiếu nại cho vé ${disputeTicket.eventTitle} đã được ghi nhận. Khoản thanh toán của vé này đã được đóng băng an toàn.`
        );
      }

      setSubmitted(true);
    } catch (err: any) {
      alert("Lỗi khi gửi khiếu nại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="text-6xl">🛡️</div>
        <h2 className="font-display font-800 text-white text-2xl">Báo Cáo Đã ĐƯỢC GHI NHẬN</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          Khoản thanh toán của vé này đã bị đóng băng ĐỘC LẬP. Người bán đã nhận được thông báo qua Gmail và có hạn chót đối chất trước khi thời gian diễn ra sự kiện chính thức bắt đầu.
        </p>
        <button onClick={() => { closeDispute(); nav("dispute-center"); }} className="sp-btn-primary px-8 py-3 font-bold text-sm cursor-pointer shadow-lg">
          Theo dõi tại Trung Tâm Tranh Chấp →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => { closeDispute(); nav("my-tickets"); }} className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer">
          ← Quay lại
        </button>
        <h1 className="font-display font-800 text-white text-xl">Khiếu Nại Sự Cố Cổng Vé & Đóng Băng Escrow</h1>
      </div>

      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 leading-relaxed">
        🛡️ <strong>Chính sách Bảo vệ Tiền Ký Quỹ:</strong> Khi gửi khiếu nại, khoản thanh toán của vé này sẽ lập tức bị phong tỏa. Người bán chỉ có thời hạn đối chất trước khi thời gian sự kiện trên vé chính thức bắt đầu.
      </div>
      
      <div className="sp-card p-6 space-y-4">
        <div>
          <label className="sp-filter-label mb-1.5 block">Loại sự cố *</label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="sp-select">
            <option value="">Chọn loại sự cố</option>
            <option value="Vé bị báo đã quét trước đó">Vé bị báo đã quét trước đó (Trùng mã)</option>
            <option value="Mã QR không hợp lệ / Vé giả mạo">Mã QR không hợp lệ / Vé giả mạo</option>
            <option value="Sai vị trí chỗ ngồi / Bị hủy vé">Sai vị trí chỗ ngồi / Bị hủy vé</option>
          </select>
        </div>

        <div>
          <label className="sp-filter-label mb-1.5 block">Mô tả chi tiết sự cố tại cổng vé</label>
          <textarea rows={3} value={detail} onChange={e => setDetail(e.target.value)} className="sp-input" placeholder="Nêu rõ tình huống lúc quét mã..." />
        </div>

        <div>
          <label className="sp-filter-label mb-1.5 block">Video bằng chứng thực tế tại cổng (Bắt buộc) *</label>
          <input type="file" accept="video/*" onChange={e => e.target.files?.[0] && setVideoFile(e.target.files[0])} className="sp-input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="sp-filter-label mb-1 block">Ngân hàng hoàn tiền *</label>
            <input placeholder="MB Bank, VCB..." value={refundBankName} onChange={e => setRefundBankName(e.target.value)} className="sp-input text-xs" />
          </div>
          <div>
            <label className="sp-filter-label mb-1 block">Số tài khoản *</label>
            <input placeholder="Nhập số TK" value={refundBankNum} onChange={e => setRefundBankNum(e.target.value)} className="sp-input text-xs font-mono" />
          </div>
          <div>
            <label className="sp-filter-label mb-1 block">Chủ tài khoản *</label>
            <input placeholder="VD: NGUYEN VAN A" value={refundBankHolder} onChange={e => setRefundBankHolder(e.target.value)} className="sp-input text-xs uppercase font-bold" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !reason || !videoFile || !refundBankNum.trim() || !refundBankHolder.trim()}
          className="w-full sp-btn-primary py-3.5 font-bold text-sm cursor-pointer disabled:opacity-40"
        >
          {loading ? "Đang gửi báo cáo..." : "Gửi Báo Cáo & Phong Tỏa Khoản Thanh Toán Vé Này →"}
        </button>
      </div>
    </div>
  );
}