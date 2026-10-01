import { useState, useEffect } from "react";
import type { MyTicket } from "../data";

interface TicketPassModalProps {
  ticket: MyTicket | null;
  isOpen: boolean;
  onClose: () => void;
  buyerName: string;
  buyerEmail: string;
  isCheckedIn: boolean;
  isReported: boolean;
  onConfirmCheckin: (ticketId: number) => void;
  onReportIssue: (ticket: MyTicket) => void;
}

export default function TicketPassModal({
  ticket,
  isOpen,
  onClose,
  buyerName,
  buyerEmail,
  isCheckedIn,
  isReported,
  onConfirmCheckin,
  onReportIssue,
}: TicketPassModalProps) {
  const [liveTime, setLiveTime] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen || !ticket) return null;

  const ticketSerial = `SP-${ticket.id.toString().padStart(6, "0")}-${(ticket.price % 997).toString().padStart(3, "0")}`;
  const qrData = `SAFEPASS-AUTH|ID:${ticket.id}|EVENT:${ticket.eventTitle}|TIER:${ticket.tier}|BUYER:${buyerName}|SERIAL:${ticketSerial}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(
    qrData
  )}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySerial = () => {
    navigator.clipboard.writeText(ticketSerial);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Determine gate door and seat based on ticket tier
  const isVip = ticket.tier.toLowerCase().includes("vip");
  const isGA = ticket.tier.toLowerCase().includes("ga") || ticket.tier.toLowerCase().includes("đứng");
  const gateDoor = isVip ? "Cổng VIP • Lối ưu tiên A1" : isGA ? "Cổng Vào Sân GA • Cửa 3" : "Cổng Khán Đài • Cửa B2";
  const seatZone = isGA ? "Vé Đứng (Tự Do) - Zone Fanzone" : `Khán Đài Tầng 2 • Ghế A-${(ticket.id % 45) + 1}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: "rgba(3, 3, 10, 0.88)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md my-auto relative print-container"
        onClick={e => e.stopPropagation()}
        style={{ animation: "spFadeScale 0.2s ease-out" }}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between mb-3 px-1 no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-display font-700 uppercase tracking-wider text-emerald-400">
              Vé Điện Tử Chính Thức • SafePass
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* ── THE TICKET PASS CONTAINER ── */}
        <div
          id="printable-ticket"
          className="rounded-3xl overflow-hidden shadow-2xl relative"
          style={{
            background: "#0c0d1c",
            border: "1px solid rgba(139, 92, 246, 0.28)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(139, 92, 246, 0.12)",
          }}
        >
          {/* Header image banner */}
          <div className="relative h-36 overflow-hidden">
            <img
              src={ticket.eventImage}
              alt={ticket.eventTitle}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(12, 13, 28, 0.3) 0%, rgba(12, 13, 28, 0.95) 100%)",
              }}
            />
            {/* Status chip */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span
                className="text-[10px] font-display font-800 uppercase px-2.5 py-1 rounded-full backdrop-blur-md"
                style={{
                  background: isCheckedIn
                    ? "rgba(16, 185, 129, 0.25)"
                    : isReported
                    ? "rgba(239, 68, 68, 0.25)"
                    : "rgba(139, 92, 246, 0.35)",
                  color: isCheckedIn ? "#34D399" : isReported ? "#F87171" : "#C4B5FD",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {isCheckedIn
                  ? "✅ ĐÃ VÀO CỔNG"
                  : isReported
                  ? "🚨 TRANH CHẤP CỔNG"
                  : "🎟️ SẴN SÀNG QUÉT CỔNG"}
              </span>

              <span
                className="text-[10px] font-display font-700 px-2 py-0.5 rounded-md bg-black/40 text-gray-300 border border-white/10"
              >
                Ký gửi Escrow
              </span>
            </div>

            {/* Event Name & Date on image */}
            <div className="absolute bottom-2 left-4 right-4">
              <h2 className="text-white font-display font-800 text-lg leading-tight line-clamp-1 drop-shadow-md">
                {ticket.eventTitle}
              </h2>
              <p className="text-gray-300 text-xs font-500 mt-0.5 flex items-center gap-1.5">
                <span>📅 {ticket.date}</span>
                <span>•</span>
                <span className="truncate">📍 {ticket.venue}</span>
              </p>
            </div>
          </div>

          {/* Ticket Key Info Grid */}
          <div className="p-4 bg-[#111227] border-b border-white/5 grid grid-cols-2 gap-3 text-left">
            <div>
              <p className="text-[10px] font-display font-700 uppercase tracking-wider text-gray-400">Hạng vé</p>
              <p className="text-sm font-display font-800 text-white truncate mt-0.5">
                <span className="text-purple-400 mr-1.5">✦</span>
                {ticket.tier}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-display font-700 uppercase tracking-wider text-gray-400">Lối vào cửa</p>
              <p className="text-xs font-display font-700 text-emerald-300 truncate mt-0.5">
                {gateDoor}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-display font-700 uppercase tracking-wider text-gray-400">Chỗ ngồi / Vị trí</p>
              <p className="text-xs font-500 text-gray-200 truncate mt-0.5">
                {seatZone}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-display font-700 uppercase tracking-wider text-gray-400">Người sở hữu vé</p>
              <p className="text-xs font-display font-700 text-white truncate mt-0.5">
                {buyerName || buyerEmail || "Khách hàng SafePass"}
              </p>
            </div>
          </div>

          {/* ── PERFORATED TICKET STUB DIVIDER ── */}
          <div className="relative py-2 flex items-center justify-center bg-[#0d0e20]">
            {/* Left notch */}
            <div
              className="absolute -left-3 w-6 h-6 rounded-full"
              style={{ background: "rgba(3, 3, 10, 1)", borderRight: "1px solid rgba(139, 92, 246, 0.28)" }}
            />
            {/* Dashed line */}
            <div className="w-full mx-5 border-b-2 border-dashed border-white/15" />
            {/* Right notch */}
            <div
              className="absolute -right-3 w-6 h-6 rounded-full"
              style={{ background: "rgba(3, 3, 10, 1)", borderLeft: "1px solid rgba(139, 92, 246, 0.28)" }}
            />
          </div>

          {/* ── QR CODE GATE SCANNER SECTION ── */}
          <div className="p-5 text-center bg-[#0d0e20]">
            {/* Live Security Anti-Screenshot Bar */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[11px] font-display font-700"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10B981",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE TOKEN: {liveTime || "Đang kết nối..."}</span>
              <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">CHỐNG CHỤP MÀN HÌNH</span>
            </div>

            {/* QR Code Container with Scanner Frame */}
            <div className="relative inline-block mx-auto p-3.5 rounded-2xl bg-white shadow-xl">
              <div className="relative w-52 h-52 sm:w-56 sm:h-56 mx-auto overflow-hidden rounded-lg flex items-center justify-center bg-white">
                <img
                  src={qrUrl}
                  alt="Concert Gate QR Pass"
                  className="w-full h-full object-contain"
                />

                {/* Animated Laser Scanning Beam */}
                <div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] pointer-events-none"
                  style={{
                    animation: "spLaserScan 2.4s ease-in-out infinite alternate",
                  }}
                />
              </div>

              {/* Corner brackets */}
              <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-purple-600" />
              <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-purple-600" />
              <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-purple-600" />
              <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-purple-600" />
            </div>

            {/* Gate Scanning Instructions */}
            <p className="text-xs text-gray-300 mt-3 font-500 leading-relaxed max-w-xs mx-auto">
              💡 <span className="font-700 text-white">Hướng dẫn vào cổng:</span> Mở 100% độ sáng màn hình, xuất trình mã QR này trực tiếp cho nhân viên kiểm soát vé tại cổng soát vé.
            </p>

            {/* Barcode Graphic & Serial */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex justify-center items-center gap-[2px] h-9 mx-auto opacity-80 max-w-[240px]">
                {/* Simulated high density barcode lines */}
                {[
                  3,1,2,1,4,2,1,3,1,2,3,1,1,4,2,1,2,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,1,2
                ].map((w, idx) => (
                  <div
                    key={idx}
                    className="h-full bg-gray-300 rounded-[0.5px]"
                    style={{ width: `${w * 1.5}px` }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="font-mono text-xs text-gray-400 font-600 tracking-widest">{ticketSerial}</span>
                <button
                  onClick={handleCopySerial}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-display font-700 underline"
                >
                  {copySuccess ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>
          </div>

          {/* ── ACTIONS FOOTER (Hidden during PDF print) ── */}
          <div className="p-4 bg-[#111227] border-t border-white/10 space-y-2.5 no-print">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 px-3 rounded-xl font-display font-700 text-xs text-white bg-white/10 hover:bg-white/15 transition-all flex items-center justify-center gap-1.5 border border-white/10"
              >
                <span>📄</span>
                <span>Tải vé / In vé PDF</span>
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `Vé Concert: ${ticket.eventTitle}`,
                      text: `Vé SafePass mã ${ticketSerial} - ${ticket.tier}`,
                    }).catch(() => {});
                  } else {
                    handleCopySerial();
                  }
                }}
                className="py-2.5 px-3 rounded-xl font-display font-700 text-xs text-gray-300 bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                title="Chia sẻ mã vé"
              >
                🔗 Chia sẻ
              </button>
            </div>

            {/* Check-in or Dispute triggers */}
            {!isCheckedIn && !isReported && (
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => {
                    onConfirmCheckin(ticket.id);
                  }}
                  className="w-full py-2.5 rounded-xl font-display font-700 text-xs text-white transition-all shadow-lg flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #059669, #10B981)",
                    boxShadow: "0 8px 20px -4px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <span>✅</span>
                  <span>Tôi đã quét mã qua cổng thành công</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onReportIssue(ticket);
                  }}
                  className="w-full py-2 rounded-xl font-display font-600 text-xs transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    color: "#F87171",
                    background: "rgba(248, 113, 113, 0.08)",
                    border: "1px solid rgba(248, 113, 113, 0.2)",
                  }}
                >
                  <span>🚨</span>
                  <span>Mã vé lỗi / Không qua được cổng? Báo cáo ngay</span>
                </button>
              </div>
            )}

            {isCheckedIn && (
              <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs font-display font-700 text-emerald-400">
                  🎉 Bạn đã vào cổng thành công! Tiền đã được giải ngân cho người bán. Chúc bạn xem concert vui vẻ!
                </p>
              </div>
            )}

            {isReported && (
              <div className="text-center p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-display font-700 text-red-400">
                  🛡️ Vé đang ở trung tâm xử lý tranh chấp khẩn cấp cổng (SLA 15-30 phút).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Close button */}
        <div className="text-center mt-3 no-print">
          <button
            onClick={onClose}
            className="text-xs font-display font-600 text-gray-400 hover:text-white transition-colors"
          >
            ← Quay lại danh sách vé của tôi
          </button>
        </div>
      </div>
    </div>
  );
}
