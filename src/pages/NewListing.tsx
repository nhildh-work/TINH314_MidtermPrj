import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

export default function NewListing() {
  const { nav, currentUser } = useApp();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("TP.HCM");
  const [tier, setTier] = useState("Standard");
  const [pricePerTicket, setPricePerTicket] = useState<number>(500000);
  const [quantity, setQuantity] = useState<number>(1);
  const [qrFiles, setQrFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Xử lý chọn nhiều file QR vé cùng lúc
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setQrFiles(filesArray);
      if (filesArray.length > 0) {
        setQuantity(filesArray.length);
      }
    }
  };

  // Xóa 1 file QR lẻ khỏi danh sách đã chọn
  const removeQrFile = (index: number) => {
    const updated = qrFiles.filter((_, i) => i !== index);
    setQrFiles(updated);
    setQuantity(updated.length > 0 ? updated.length : 1);
  };

  const depositPerTicket = Math.round(pricePerTicket * 0.25);
  const totalDeposit = depositPerTicket * qrFiles.length;
  const platformFeePerTicket = Math.round(pricePerTicket * 0.05);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!eventName.trim() || !eventDate.trim() || !venue.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ thông tin sự kiện và địa điểm!");
      return;
    }

    if (pricePerTicket < 10000) {
      setErrorMsg("Giá bán tối thiểu cho mỗi vé là 10.000 VND!");
      return;
    }

    if (qrFiles.length === 0) {
      setErrorMsg("Vui lòng tải lên ít nhất 1 file ảnh mã QR vé!");
      return;
    }

    if (!currentUser) {
      setErrorMsg("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!");
      return;
    }

    setLoading(true);

    try {
      // TỰ ĐỘNG TÁCH THÀNH N BẢN GHI TICKETS RIÊNG BIỆT DƯỚI DATABASE
      const ticketsToInsert = qrFiles.map((file, idx) => ({
        seller_id: currentUser.id,
        event_name: eventName.trim(),
        event_date: eventDate,
        venue: `${venue.trim()} (${city})`,
        city: city,
        tier: qrFiles.length > 1 ? `${tier} - Vé #${idx + 1}` : tier,
        price: Number(pricePerTicket),
        qr_code_url: file.name,
        status: "available",
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("tickets")
        .insert(ticketsToInsert)
        .select();

      if (error) throw error;

      setCreatedCount(data ? data.length : qrFiles.length);
      setSuccess(true);
    } catch (err: any) {
      console.error("Lỗi khi tạo niêm yết vé:", err);
      setErrorMsg(err.message || "Không thể đăng bán vé. Vui lòng kiểm tra lại kết nối Database!");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-4xl animate-bounce">
          🎉
        </div>
        <div>
          <h2 className="font-display font-800 text-white text-2xl">Đăng Bán Thành Công!</h2>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">
            Hệ thống SafePass đã tự động tách thành <strong className="text-purple-400">{createdCount} vé độc lập</strong>. Mỗi vé chứa 1 mã QR riêng biệt để người mua có thể chọn mua lẻ.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-left space-y-2 max-w-md mx-auto">
          <div className="flex justify-between">
            <span className="text-gray-400">Sự kiện:</span>
            <span className="font-bold text-white">{eventName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Số lượng vé đã tách:</span>
            <span className="font-bold text-emerald-400">{createdCount} vé</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Đơn giá niêm yết:</span>
            <span className="font-bold text-purple-300">{fmt(pricePerTicket)} / vé</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Tiền cọc ký quỹ Escrow:</span>
            <span className="font-bold text-amber-300">{fmt(depositPerTicket * createdCount)} (25%)</span>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setSuccess(false);
              setQrFiles([]);
              setEventName("");
            }}
            className="sp-btn-ghost px-6 py-3 font-display font-700 text-xs cursor-pointer"
          >
            + Đăng bán thêm vé khác
          </button>
          <button
            onClick={() => nav("seller-dash")}
            className="sp-btn-primary px-8 py-3 font-display font-700 text-xs cursor-pointer shadow-lg"
          >
            Quản lý kho vé của tôi →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => nav("seller-dash")} className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer">
            ← Quay lại
          </button>
          <div>
            <h1 className="font-display font-800 text-white text-2xl">Đăng Bán Vé Mới</h1>
            <p className="text-xs text-gray-400 mt-0.5">Tải lên nhiều mã QR cùng lúc để hệ thống tự động tách từng vé độc lập</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="sp-card p-6 md:p-8 space-y-6">
        {/* Tên sự kiện */}
        <div>
          <label className="sp-filter-label mb-2 block text-gray-200">1. Tên sự kiện / Concert / Show diễn *</label>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            className="sp-input text-sm"
            placeholder="VD: Anh Trai Vượt Ngàn Chông Gai 2026, BlackPink Born Pink..."
            required
          />
        </div>

        {/* Thời gian & Địa điểm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">2. Thời gian diễn ra *</label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="sp-input text-sm"
              required
            />
          </div>

          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">3. Thành phố *</label>
            <select value={city} onChange={e => setCity(e.target.value)} className="sp-select text-sm">
              <option value="TP.HCM">TP. Hồ Chí Minh</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
              <option value="Cần Thơ">Cần Thơ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
        </div>

        <div>
          <label className="sp-filter-label mb-2 block text-gray-200">4. Địa điểm cụ thể *</label>
          <input
            type="text"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className="sp-input text-sm"
            placeholder="VD: Sân vận động Quốc gia Mỹ Đình, Vinhomes Grand Park..."
            required
          />
        </div>

        {/* Hạng vé & Đơn giá */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">5. Hạng vé / Sơ đồ khán đài</label>
            <input
              type="text"
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="sp-input text-sm"
              placeholder="VD: VIP 1, CAT 2, SVIP Standing A..."
            />
          </div>

          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">6. Đơn giá bán cho MỖI VÉ (VND) *</label>
            <input
              type="number"
              value={pricePerTicket}
              step={10000}
              min={10000}
              onChange={e => setPricePerTicket(Number(e.target.value))}
              className="sp-input font-display font-800 text-emerald-400 text-base"
              required
            />
          </div>
        </div>

        {/* Mục Tải Nhiều Mã QR Vé */}
        <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="font-display font-800 text-purple-300 text-sm block">
                📲 7. Upload Mã QR Vé (Quét chọn nhiều file cùng lúc) *
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Mỗi file ảnh tương ứng với 1 vé độc lập. Nhấn giữ Ctrl/Cmd hoặc kéo quét để chọn cả 5 file QR cùng lúc.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 shrink-0">
              {qrFiles.length} file QR đã chọn
            </span>
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="sp-input text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
          />

          {/* Danh sách xem trước các file QR được tách */}
          {qrFiles.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-purple-500/20">
              <p className="text-xs font-bold text-gray-300">
                Xem trước {qrFiles.length} vé độc lập sẽ được tạo tự động:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {qrFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-purple-400 mr-1.5">Vé #{idx + 1}:</span>
                      <span className="text-gray-300 truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-400">{fmt(pricePerTicket)}</span>
                      <button
                        type="button"
                        onClick={() => removeQrFile(idx)}
                        className="text-red-400 hover:text-red-300 font-bold px-1"
                        title="Xóa vé này"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bảng tóm tắt phí & Tiền cọc Escrow */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-gray-300">
            <span>Số lượng vé niêm yết:</span>
            <span className="font-bold text-white text-sm">{qrFiles.length} vé</span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Tổng giá trị niêm yết:</span>
            <span className="font-bold text-white">{fmt(pricePerTicket * qrFiles.length)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Phí dịch vụ nền tảng SafePass (5%):</span>
            <span className="font-bold text-purple-300">{fmt(platformFeePerTicket * qrFiles.length)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-300 pt-2 border-t border-white/10">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <span>🛡️</span>
              <span>Tiền cọc ký quỹ Escrow bảo vệ (25%/vé):</span>
            </span>
            <span className="font-display font-800 text-amber-400 text-sm">{fmt(totalDeposit)}</span>
          </div>
          <p className="text-[10px] text-gray-400 italic">
            * Tiền cọc ký quỹ 25% sẽ được hoàn trả lại 100% cho người bán ngay khi sự kiện kết thúc trôi chảy không phát sinh khiếu nại vé giả/vé trùng.
          </p>
        </div>

        {/* Ghi chú thêm */}
        <div>
          <label className="sp-filter-label mb-2 block text-gray-200">Ghi chú bổ sung (Không bắt buộc)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="sp-input text-xs"
            placeholder="VD: Nhận vé cứng trực tiếp tại cổng, vé chính chủ đổi tên được..."
          />
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl leading-relaxed">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Nút gửi */}
        <button
          type="submit"
          disabled={loading || qrFiles.length === 0}
          className="w-full sp-btn-primary py-4 font-display font-800 text-sm cursor-pointer disabled:opacity-40 shadow-xl"
        >
          {loading ? "Đang xử lý tách vé..." : `Xác Nhận Niêm Yết & Tách ${qrFiles.length > 0 ? qrFiles.length : ""} Vé Độc Lập →`}
        </button>
      </form>
    </div>
  );
}