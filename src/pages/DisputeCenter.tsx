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
  resolution_notes?: string;
  penalty_option?: string;
  buyerId: string;
  sellerId: string;
}

export default function DisputeCenter() {
  const { nav, role, currentUser, currentProfile } = useApp();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [sellerText, setSellerText] = useState("");
  const [sellerVideoFile, setSellerVideoFile] = useState<File | null>(null);
  const [uploadingSeller, setUploadingSeller] = useState(false);
  const [adminPenalty, setAdminPenalty] = useState("buyer_win_no_penalty");

  const uid = currentUser?.id || currentProfile?.id;
  const isAdmin = role === "admin" || currentUser?.email === "safepass.vn@gmail.com";

  const fetchDisputes = async () => {
    if (!uid) return;

    const { data, error } = await supabase
      .from("disputes")
      .select("*, tickets(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Lỗi fetch disputes:", error.message);
      return;
    }

    if (data) {
      const mapped: Dispute[] = data.map((d: any) => ({
        id: String(d.id),
        ticketId: d.ticket_id,
        eventTitle: d.tickets?.event_name || "Vé Concert",
        eventStartTime: d.tickets?.event_date || new Date().toISOString(),
        amount: Number(d.tickets?.price || 0),
        status: d.status,
        buyerReason: d.reason,
        buyerDetail: d.description || d.reason,
        buyerVideo: d.evidence_url,
        createdAt: d.created_at,
        refundBankName: d.refund_bank_name,
        refundBankAccount: d.refund_bank_account,
        refundAccountHolder: d.refund_account_holder,
        sellerResponse: d.seller_response,
        sellerVideo: d.seller_evidence_url,
        resolution_notes: d.resolution_notes,
        penalty_option: d.penalty_option,
        buyerId: String(d.buyer_id),
        sellerId: String(d.seller_id), 
      }));

      setDisputes(mapped);
    }
  };

  useEffect(() => {
    fetchDisputes();
    const channel = supabase
      .channel("dispute_center_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, () => fetchDisputes())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  const handleAdminRuling = async () => {
    if (!selectedDispute) return;

    let rulingMessage = "";
    let finalStatus = "";
    
    const ticketPrice = selectedDispute.amount;
    const penaltyAmount = ticketPrice * 0.05; 
    const totalBuyerReceivesWithPenalty = ticketPrice + penaltyAmount;

    if (adminPenalty === "buyer_win_no_penalty") {
      rulingMessage = `PHÁN QUYẾT: NGƯỜI MUA THẮNG (Lỗi Nhẹ). Hoàn 100% tiền vé (${ticketPrice.toLocaleString()} VND) cho Người Mua. Trả cọc cho Người Bán.`;
      finalStatus = "ruled_buyer_100";
      await supabase.from("tickets").update({ status: "refunded" }).eq("id", selectedDispute.ticketId);

    } else if (adminPenalty === "buyer_win_penalty") {
      rulingMessage = `PHÁN QUYẾT: NGƯỜI MUA THẮNG (Lỗi Nặng). Hoàn vé + Bồi thường 5% tổng cộng (${totalBuyerReceivesWithPenalty.toLocaleString()} VND). Phạt cấn trừ trực tiếp vào cọc của Người Bán.`;
      finalStatus = "ruled_buyer_105";
      await supabase.from("tickets").update({ status: "refunded" }).eq("id", selectedDispute.ticketId);

    } else if (adminPenalty === "seller_win") {
      rulingMessage = `PHÁN QUYẾT: NGƯỜI BÁN THẮNG. Bằng chứng hợp lệ. Giải ngân 100% tiền vé + hoàn lại 25% cọc cho Người Bán.`;
      finalStatus = "ruled_seller";
      await supabase.from("tickets").update({ status: "completed" }).eq("id", selectedDispute.ticketId);
    }

    await supabase.from("disputes").update({ 
      resolution_notes: rulingMessage, 
      penalty_option: adminPenalty,
      status: finalStatus,
      resolved_at: new Date().toISOString()
    }).eq("id", selectedDispute.id);
    
    alert("Đã ban hành phán quyết và áp dụng chính sách phạt thành công!");
    fetchDisputes();
    setSelectedDispute(null);
  };

  const handleSellerRespond = async () => {
    if (!selectedDispute || !sellerText || !sellerVideoFile) return;

    const now = new Date().getTime();
    const eventTime = new Date(selectedDispute.eventStartTime).getTime();

    if (now >= eventTime) {
      alert("❌ Đã quá thời gian bắt đầu sự kiện! Bạn đã mất quyền đối chất và tự động bị xử thua.");
      await supabase.from("disputes").update({
        status: "final_buyer_autoloss",
        resolution_notes: "TỰ ĐỘNG XỬ THUA: Người Bán không nộp đối chất trước thời gian sự kiện. Hoàn 100% tiền vé cho Người mua.",
        resolved_at: new Date().toISOString()
      }).eq("id", selectedDispute.id);
      await supabase.from("tickets").update({ status: "refunded" }).eq("id", selectedDispute.ticketId);
      fetchDisputes();
      return;
    }

    try {
      setUploadingSeller(true);
      const fileExt = sellerVideoFile.name.split('.').pop();
      const fileName = `seller_resp_${selectedDispute.id}_${Date.now()}.${fileExt}`;

      const { error: upErr } = await supabase.storage
        .from('dispute-videos')
        .upload(fileName, sellerVideoFile, { 
          upsert: true,
          contentType: sellerVideoFile.type 
        });

      if (upErr) throw upErr;

      const { data: pubUrl } = supabase.storage.from('dispute-videos').getPublicUrl(fileName);

      await supabase.from("disputes").update({
        seller_response: sellerText, 
        seller_evidence_url: pubUrl.publicUrl, 
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
        <button onClick={() => nav("seller-dash")} className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer">
          ← Quay lại
        </button>
        <h1 className="font-display font-800 text-white text-2xl">Trung Tâm Xử Lý Tranh Chấp SafePass</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {selectedDispute ? (
          <div className="sp-card p-6 space-y-5">
            <h2 className="font-display font-800 text-white text-lg">Chi Tiết Tranh Chấp #{selectedDispute.id}</h2>
            
            <div className="p-4 bg-black/40 rounded-xl text-xs space-y-2 border border-white/5">
              <p className="text-gray-300">Sự kiện: <strong>{selectedDispute.eventTitle}</strong></p>
              <p className="text-gray-300">Giá trị vé: <strong className="text-emerald-400">{selectedDispute.amount.toLocaleString()} VND</strong></p>
              <p className="text-gray-300">Lý do Người Mua: <strong className="text-red-400">{selectedDispute.buyerReason}</strong></p>
              <p className="text-gray-300">Mô tả chi tiết: {selectedDispute.buyerDetail}</p>
              
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
            </div>

            {(String(selectedDispute.sellerId) === String(uid) || isAdmin) && selectedDispute.status === "pending_seller" && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
                <p className="font-bold text-purple-300 text-xs">📤 Người Bán Nộp Đối Chất (Hạn chót: Trước thời gian sự kiện)</p>
                <textarea rows={3} value={sellerText} onChange={e => setSellerText(e.target.value)} placeholder="Nhập lý do đối chất..." className="sp-input" />
                <input type="file" accept="video/*" onChange={e => e.target.files?.[0] && setSellerVideoFile(e.target.files[0])} className="sp-input" />
                <button onClick={handleSellerRespond} disabled={uploadingSeller} className="w-full sp-btn-primary py-2.5 font-bold text-xs cursor-pointer disabled:opacity-50">
                  {uploadingSeller ? "Đang tải bằng chứng lên..." : "Nộp bằng chứng đối chất ngay →"}
                </button>
              </div>
            )}

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

            {selectedDispute.resolution_notes && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 leading-relaxed font-bold">
                ⚖️ {selectedDispute.resolution_notes}
              </div>
            )}

            {isAdmin && selectedDispute.status !== "ruled_buyer_100" && selectedDispute.status !== "ruled_buyer_105" && selectedDispute.status !== "ruled_seller" && (
              <div className="pt-4 border-t border-white/10 space-y-4">
                <p className="font-bold text-amber-400 text-xs">⚖️ Bảng Điều Khiển Phán Quyết (Admin):</p>
                
                <div>
                  <label className="sp-filter-label mb-2 block">Chọn mức độ xử phạt Escrow:</label>
                  <select 
                    value={adminPenalty} 
                    onChange={(e) => setAdminPenalty(e.target.value)} 
                    className="sp-select w-full p-2 bg-gray-800 text-white rounded border border-gray-600"
                  >
                    <option value="buyer_win_no_penalty">1. Người Mua thắng (Hoàn 100% vé - Trả cọc cho Người Bán)</option>
                    <option value="buyer_win_penalty">2. Người Mua thắng (Hoàn vé + Bồi thường 5% từ cọc Người Bán)</option>
                    <option value="seller_win">3. Người Bán thắng (Giải ngân tiền vé + Hoàn 25% cọc)</option>
                  </select>
                </div>

                <button
                  onClick={handleAdminRuling}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-display font-800 text-sm rounded-xl cursor-pointer transition-all"
                >
                  XÁC NHẬN PHÁN QUYẾT TỪ ADMIN
                </button>
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