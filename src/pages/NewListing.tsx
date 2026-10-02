import { useState } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

const fmt = (p: number) => p.toLocaleString("vi-VN") + " VND";

export default function NewListing() {
  const { nav, currentUser, currentProfile, openCheckout } = useApp();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState("Hà Nội");
  const [venue, setVenue] = useState("");
  const [tier, setTier] = useState("Standard");
  const [seatZone, setSeatZone] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [pricePerTicket, setPricePerTicket] = useState<number>(500000);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [seatMapFile, setSeatMapFile] = useState<File | null>(null);
  const [seatMapPreview, setSeatMapPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeUserId = currentUser?.id || currentProfile?.id;
  const depositPerTicket = Math.round(pricePerTicket * 0.25);
  const totalDeposit = depositPerTicket * quantity;
  const totalListingValue = pricePerTicket * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!eventName.trim() || !eventDate.trim() || !venue.trim() || !city.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ tên sự kiện, thời gian, thành phố và địa điểm!");
      return;
    }

    if (quantity < 1) {
      setErrorMsg("Số lượng vé tối thiểu là 1!");
      return;
    }

    if (pricePerTicket <= 0) {
      setErrorMsg("Giá bán vé phải lớn hơn 0 VND!");
      return;
    }

    if (!activeUserId) {
      setErrorMsg("Bạn chưa đăng nhập. Vui lòng đăng nhập tài khoản để đăng bán vé!");
      return;
    }

    setLoading(true);

    try {
      const fullTier = seatZone.trim()
        ? `${tier.trim()} [Vị trí: ${seatZone.trim()}]`
        : tier.trim();

      // Chuẩn bị dữ liệu danh sách vé theo số lượng người bán điền
      const ticketsToInsert = Array.from({ length: quantity }, (_, idx) => ({
        seller_id: activeUserId,
        event_name: eventName.trim(),
        event_date: eventDate,
        venue: venue.trim(),
        city: city.trim(),
        tier: quantity > 1 ? `${fullTier} (Vé #${idx + 1})` : fullTier,
        price: Number(pricePerTicket),
        status: "pending_deposit",
        created_at: new Date().toISOString(),
      }));

      const { data: inserted, error } = await supabase
        .from("tickets")
        .insert(ticketsToInsert)
        .select();

      if (error) throw error;

      if (inserted && inserted.length > 0) {
        const firstTicket = inserted[0];
        // 🚀 BẬT NGAY POPUP CHUYỂN KHOẢN CỌC KÝ QUỸ 25% QUA SEPAY / VIETQR
        openCheckout({
          id: firstTicket.id,
          eventTitle: eventName.trim(),
          eventImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
          tier: `${fullTier} (Cọc 25%)`,
          price: totalDeposit,
          city: city.trim(),
          venue: venue.trim(),
          eventDate: eventDate,
          isDeposit: true, // LUỒNG ĐÓNG CỌC 25%
        });
      }
    } catch (err: any) {
      console.error("Lỗi khi đăng bán vé:", err);
      setErrorMsg(err.message || "Không thể đăng bán vé. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => nav("seller-dash")}
          className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer"
        >
          ← Quay lại
        </button>
        <div>
          <h1 className="font-display font-800 text-white text-2xl">Đăng Bán Vé Mới</h1>
          <p className="text-xs text-gray-400 mt-0.5">Điền thông tin vé để niêm yết lên sàn giao dịch an toàn SafePass</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="sp-card p-6 md:p-8 space-y-6">
        {/* Tên sự kiện */}
        <div>
          <label className="sp-filter-label mb-2 block text-gray-200">
            Tên sự kiện / Concert / Show diễn *
          </label>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            className="sp-input text-sm"
            placeholder="VD: Anh Trai Vượt Ngàn Chông Gai 2026, BlackPink Born Pink..."
            required
          />
        </div>

        {/* Thời gian & Thành phố */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">
              Thời gian diễn ra *
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="sp-input text-sm"
              required
            />
          </div>

          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">
              Thành phố *
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="sp-input text-sm"
              placeholder="VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
              required
            />
          </div>
        </div>

        {/* Địa điểm cụ thể */}
        <div>
          <label className="sp-filter-label mb-2 block text-gray-200">
            Địa điểm cụ thể (Sân vận động, Nhà thi đấu...) *
          </label>
          <input
            type="text"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className="sp-input text-sm"
            placeholder="VD: Sân vận động Mỹ Đình, SVĐ Quân khu 7, Trung tâm Hội nghị Quốc gia..."
            required
          />
        </div>

        {/* Hạng vé, Số lượng & Đơn giá */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">
              Hạng vé / Khu vực
            </label>
            <input
              type="text"
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="sp-input text-sm"
              placeholder="VD: VIP 1, CAT 2, Standard..."
            />
          </div>

          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">
              Số lượng vé *
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="sp-input text-sm font-bold text-white"
              required
            />
          </div>

          <div>
            <label className="sp-filter-label mb-2 block text-gray-200">
              Đơn giá mỗi vé (VND) *
            </label>
            <input
              type="number"
              value={pricePerTicket}
              step="any"
              min={1}
              onChange={e => setPricePerTicket(Number(e.target.value))}
              className="sp-input font-display font-800 text-emerald-400 text-base"
              required
            />
          </div>
        </div>

        {/* Vị trí đứng & Sơ đồ chỗ đứng (Map) - Optional */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="text-base">🗺️</span>
            <h3 className="font-display font-700 text-white text-xs uppercase tracking-wider">
              Vị Trí Đứng & Sơ Đồ Chỗ (Optional - Tùy Chọn)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="sp-filter-label mb-1.5 block text-gray-200">
                Chỗ ngồi / Vị trí đứng cụ thể (Optional)
              </label>
              <input
                type="text"
                value={seatZone}
                onChange={e => setSeatZone(e.target.value)}
                className="sp-input text-sm"
                placeholder="VD: Khu Standing A - Cổng 2, Hoặc Hàng H - Ghế 15..."
              />
            </div>

            <div>
              <label className="sp-filter-label mb-1.5 block text-gray-200">
                Tải ảnh sơ đồ vị trí đứng / Seat Map (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setSeatMapFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSeatMapPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setSeatMapPreview(null);
                  }
                }}
                className="sp-input text-xs cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600/80 file:text-white"
              />
            </div>
          </div>

          {seatMapPreview && (
            <div className="mt-2 p-2 rounded-xl bg-black/40 border border-white/10 max-w-xs">
              <p className="text-[10px] text-gray-400 mb-1">Xem trước sơ đồ chỗ đứng:</p>
              <img src={seatMapPreview} alt="Sơ đồ vị trí" className="w-full h-32 object-contain rounded-lg bg-black" />
            </div>
          )}
        </div>

        {/* Upload File Vé / Ảnh QR */}
        <div>
          <label className="sp-filter-label mb-2 block text-gray-200">
            Ảnh vé điện tử / Mã QR vé (Tùy chọn)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={e => setQrFile(e.target.files?.[0] || null)}
            className="sp-input text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            File ảnh vé sẽ được hệ thống mã hóa bảo mật và chỉ bàn giao cho người mua sau khi giao dịch thành công.
          </p>
        </div>

        {/* Tóm tắt tiền & Ký quỹ */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-300">
            <span>Số lượng vé đăng bán:</span>
            <span className="font-bold text-white">{quantity} vé</span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Đơn giá niêm yết:</span>
            <span className="font-bold text-purple-300">{fmt(pricePerTicket)} / vé</span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Tổng giá trị niêm yết:</span>
            <span className="font-bold text-white">{fmt(totalListingValue)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-300 pt-2 border-t border-white/10">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <span>🛡️</span>
              <span>Tiền cọc ký quỹ bảo vệ Escrow (25%):</span>
            </span>
            <span className="font-display font-800 text-amber-400 text-sm">
              {fmt(totalDeposit)}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 italic">
            * Tiền cọc 25% được hoàn trả 100% về tài khoản của bạn ngay khi sự kiện kết thúc trôi chảy.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl leading-relaxed">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Nút submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full sp-btn-primary py-4 font-display font-800 text-sm cursor-pointer disabled:opacity-50 shadow-xl"
        >
          {loading ? "Đang xử lý..." : `Xác Nhận Đăng Bán ${quantity} Vé →`}
        </button>
      </form>
    </div>
  );
}
