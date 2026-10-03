import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

interface Dispute {
  id: string;
  ticketId: number;
  eventTitle: string;
  eventStartTime: string;
  amount: number;
  status: string;
  buyerReason: string;
  buyerDetail: string;
  buyerVideo: string;
  createdAt: string;
  refundBankName?: string;
  refundBankAccount?: string;
  refundAccountHolder?: string;
  sellerResponse?: string;
  sellerVideo?: string;
  ruling?: string;
}

export default function DisputeCenter() {
  const { nav, role, currentUser, currentProfile } = useApp();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [sellerText, setSellerText] = useState("");
  const [sellerVideoFile, setSellerVideoFile] = useState<File | null>(null);
  const [uploadingSeller, setUploadingSeller] = useState(false);

  const isAdmin = role === "admin" || currentUser?.email === "admin@safepass.vn";
  const isSeller = role === "seller";
  const uid = currentUser?.id || currentProfile?.id;

  const fetchDisputes = async () => {
    if (!uid) return;

    let query = supabase.from("disputes").select("*, tickets(*)");

    // Lọc đúng dữ liệu của User đang đăng nhập
    if (!isAdmin) {
      query = query.or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: Dispute[] = data.map((d: any) => ({
        id: String(d.id),
        ticketId: d.ticket_id,
        eventTitle: d.tickets?.event_name || "Vé Concert",
        eventStartTime: d.tickets?.event_date || new Date().toISOString(),
        amount: Number(d.tickets?.price || 0),
        status: d.status,
        buyerReason: d.reason,
        buyerDetail: d.description || d.reason,
        buyerVideo: d.video_url,
        createdAt: d.created_at,
        refundBankName: d.refund_bank_name,
        refundBankAccount: d.refund_bank_account,
        refundAccountHolder: d.refund_account_holder,
        sellerResponse: d.seller_response,
        sellerVideo: d.seller_video,
        ruling: d.ruling,
      }));
      setDisputes(mapped);
    }
  };

  useEffect(() => {
    fetchDisputes();

    const channel = supabase
      .channel("dispute_center_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, () => {
        fetchDisputes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  // PHÁN QUYẾT ADMIN
  const handleAdminRuling = async (winner: "buyer" | "seller") => {
    if (!selectedDispute) return;

    const claimTime = new Date(selectedDispute.createdAt).getTime();
    const eventTime = new Date(selectedDispute.eventStartTime).getTime();
    const diffHours = (eventTime - claimTime) / (1000 * 60 * 60);

    let rulingMessage = "";
    let finalStatus = "";

    if (winner === "buyer") {
      if (diffHours >= 2) {
        rulingMessage = `PHÁN QUYẾT ADMIN: Người Mua thắng án (Khiếu nại trước giờ G > 2 tiếng). Hoàn trả 100% tiền vé (${selectedDispute.amount.toLocaleString()} VND) cho Người Mua. Giải ngân lại cọc cho Người Bán.`;
        finalStatus = "ruled_buyer_100";
      } else {
        const bonusAmount = selectedDispute.amount * 1.05;
        rulingMessage = `PHÁN QUYẾT ADMIN: Người Mua thắng án (Khiếu nại khẩn cấp sát giờ diễn < 2 tiếng). Bồi thường 105% giá vé (${bonusAmount.toLocaleString()} VND - Phạt 5% cấn trừ trực tiếp tiền cọc Người Bán).`;
        finalStatus = "ruled_buyer_105";
      }

      await supabase.from("tickets").update({ status: "refunded" }).eq("id", selectedDispute.ticketId);
    } else {
      rulingMessage = `PHÁN QUYẾT ADMIN: Người Bán thắng án (Bằng chứng vé gốc hợp lệ). Giải ngân 100% tiền bán vé + 25% tiền cọc cho Người Bán.`;
      finalStatus = "ruled_seller";

      await supabase.from("tickets").update({ status: "completed" }).eq("id", selectedDispute.ticketId);
    }

    await supabase.from("disputes").update({
      ruling: rulingMessage,
      status: finalStatus,
    }).eq("id", selectedDispute.id);

    alert("Đã ban hành phán quyết thành công!");
    fetchDisputes();
    setSelectedDispute(null);
  };

  // NGƯỜI BÁN NỘP BẰNG CHỨNG ĐỐI CHẤT
  const handleSellerRespond = async () => {
    if (!selectedDispute || !sellerText || !sellerVideoFile) return;

    const now = new Date().getTime();
    const eventTime = new Date(selectedDispute.eventStartTime).getTime();

    if (now >= eventTime) {
      alert("❌ Đã quá thời gian bắt đầu sự kiện! Bạn đã mất quyền đối chất và tự động bị xử thua.");

      await supabase.from("disputes").update({
        status: "final_buyer_autoloss",
        ruling: "TỰ ĐỘNG XỬ THUA: Người Bán không nộp đối chất trước thời gian sự kiện bắt đầu. Người Mua thắng 100% & Người Bán không được quyền kháng cáo.",
      }).eq("id", selectedDispute.id);

      await supabase.from("tickets").update({ status: "refunded" }).eq("id", selectedDispute.ticketId);
      fetchDisputes();
      return;
    }

    try {
      setUploadingSeller(true);

      // Upload video đối chất của Seller lên Storage
      const fileExt = sellerVideoFile.name.split('.').pop();
      const fileName = `seller_resp_${selectedDispute.id}_${Date.now()}.${fileExt}`;

      const { error: upErr } = await supabase.storage
        .from('dispute-videos')
        .upload(fileName, sellerVideoFile, { upsert: true });

      if (upErr) throw upErr;

      const { data: pubUrl } = supabase.storage.from('dispute-videos').getPublicUrl(fileName);

      await supabase.from("disputes").update({
        seller_response: sellerText,
        seller_video: pubUrl.publicUrl,
        status: "under_review",
      }).eq("id", selectedDispute.id);

      alert("Nộp đối chất thành công! Chờ Admin duyệt phán quyết.");
      fetchDisputes();
    } catch (e: any) {
      alert("Lỗi nộp đối chất: " + e.message);
    } finally {
      setUploadingSeller(false);
    }
  };

  return (
    <div className="max-w-[1680px] mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(isSeller ? "seller-dash" : "my-tickets")} className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer">
          ← Quay lại
        </button>
        <h1 className="font-display font-800 text-white text-2xl">Trung Tâm Xử Lý Tranh Chấp SafePass</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Danh sách */}
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <div className="sp-card p-12 text-center text-gray-500 text-xs">Chưa có tranh chấp nào.</div>
          ) : (
            disputes.map(d => (
              <div
                key={d.id}
                onClick={() => setSelectedDispute(d)}
                className={`sp-card p-5 cursor-pointer hover:border-purple-500/50 transition-all ${selectedDispute?.id === d.id ? 'border-purple-500 bg-purple-500/5' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-white text-sm">#{d.id} - {d.eventTitle}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">Lý do: {d.buyerReason}</p>
              </div>
            ))
          )}
        </div>

        {/* Chi tiết */}
        {selectedDispute ? (
          <div className="sp-card p-6 space-y-5">
            <h2 className="font-display font-800 text-white text-lg">Chi Tiết Tranh Chấp #{selectedDispute.id}</h2>
            
            <div className="p-4 bg-black/40 rounded-xl text-xs space-y-2 border border-white/5">
              <p className="text-gray-300">Sự kiện: <strong>{selectedDispute.eventTitle}</strong></p>
              <p className="text-gray-300">Giá trị vé: <strong className="text-emerald-400">{selectedDispute.amount.toLocaleString()} VND</strong></p>
              <p className="text-gray-300">Lý do Người Mua: <strong className="text-red-400">{selectedDispute.buyerReason}</strong></p>
              <p className="text-gray-300">Mô tả chi tiết: {selectedDispute.buyerDetail}</p>
              
              {/* VIDEO BẰNG CHỨNG NGƯỜI MUA */}
              {selectedDispute.buyerVideo && (
                <div className="pt-2">
                  <p className="text-gray-400 mb-1 font-bold">🎥 Video bằng chứng của Người Mua:</p>
                  {selectedDispute.buyerVideo.startsWith("http") ? (
                    <video src={selectedDispute.buyerVideo} controls className="w-full rounded-xl bg-black max-h-60" />
                  ) : (
                    <p className="text-blue-400 font-bold">{selectedDispute.buyerVideo}</p>
                  )}
                </div>
              )}

              {selectedDispute.refundBankAccount && (
                <p className="text-purple-300 pt-2 border-t border-white/5 font-mono">
                  🏦 TK Nhận Hoàn Tiền: {selectedDispute.refundBankName} - {selectedDispute.refundBankAccount} ({selectedDispute.refundAccountHolder})
                </p>
              )}
            </div>

            {/* FORM NGƯỜI BÁN NỘP ĐỐI CHẤT */}
            {isSeller && selectedDispute.status === "pending_seller" && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
                <p className="font-bold text-purple-300 text-xs">📤 Người Bán Nộp Đối Chất (Hạn chót: Trước thời gian sự kiện)</p>
                <textarea rows={3} value={sellerText} onChange={e => setSellerText(e.target.value)} placeholder="Nhập lý do đối chất..." className="sp-input" />
                <input type="file" accept="video/*" onChange={e => e.target.files?.[0] && setSellerVideoFile(e.target.files[0])} className="sp-input" />
                <button onClick={handleSellerRespond} disabled={uploadingSeller} className="w-full sp-btn-primary py-2.5 font-bold text-xs cursor-pointer disabled:opacity-50">
                  {uploadingSeller ? "Đang tải bằng chứng lên..." : "Nộp bằng chứng đối chất ngay →"}
                </button>
              </div>
            )}

            {/* BẰNG CHỨNG NGƯỜI BÁN ĐÃ NỘP */}
            {selectedDispute.sellerResponse && (
              <div className="p-4 bg-purple-500/10 rounded-xl text-xs space-y-2 border border-purple-500/20">
                <p className="font-bold text-purple-300">Bằng chứng đối chất của Người bán:</p>
                <p className="text-gray-200">{selectedDispute.sellerResponse}</p>
                {selectedDispute.sellerVideo?.startsWith("http") ? (
                  <video src={selectedDispute.sellerVideo} controls className="w-full rounded-xl bg-black max-h-60" />
                ) : (
                  <p className="text-blue-400 font-bold">🎥 {selectedDispute.sellerVideo}</p>
                )}
              </div>
            )}

            {/* PHÁN QUYẾT ADMIN */}
            {selectedDispute.ruling && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 leading-relaxed font-bold">
                ⚖️ {selectedDispute.ruling}
              </div>
            )}

            {/* CONTROL PANEL DÀNH CHO ADMIN */}
            {isAdmin && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <p className="font-bold text-amber-400 text-xs">⚖️ Bảng Điều Khiển Phán Quyết Admin:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAdminRuling("buyer")}
                    className="py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    ✅ Xử NGƯỜI MUA Thắng (Hoàn 100% hoặc 105%)
                  </button>
                  <button
                    onClick={() => handleAdminRuling("seller")}
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    ✅ Xử NGƯỜI BÁN Thắng (Giải ngân 100% + Cọc)
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="sp-card p-12 text-center text-gray-500 text-xs">
            Chọn 1 đơn tranh chấp bên trái để xem chi tiết.
          </div>
        )}
      </div>
    </div>
  );
}