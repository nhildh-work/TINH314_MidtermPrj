import { useState } from "react";
import { useApp } from "../context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerAppeal {
  reason: string;
  video?: string;
  submittedAt: string;
}

interface BuyerAppeal {
  reason: string;
  video?: string;
  submittedAt: string;
}

interface Dispute {
  id: string;
  ticketTitle: string;
  tier: string;
  amount: number;
  status: string;
  buyerName: string;
  buyerReason: string;
  buyerDetail: string;
  buyerVideo: string;
  buyerSubmittedAt: string;
  sellerResponse?: string;
  sellerVideo?: string;
  sellerRespondedAt?: string;
  ruling?: string;
  ruledAt?: string;
  buyerAppeal?: BuyerAppeal;
  sellerAppeal?: SellerAppeal;
  finalRuling?: string;
  finalAt?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const DISPUTES: Dispute[] = [
  {
    id: "D-2026-001",
    ticketTitle: "BLACKPINK World Tour – Born Pink Final",
    tier: "Zone A",
    amount: 1800000,
    status: "under_review",
    buyerName: "Nguyễn M.",
    buyerReason: "Vé đã được quét trước khi tôi dùng",
    buyerDetail:
      "Tôi đến cổng soát vé lúc 19:15, quét QR thì BTC báo 'Vé đã được sử dụng lúc 18:42'. Tôi chưa vào cổng lần nào trước đó.",
    buyerVideo: "evidence_buyer_blackpink.mp4",
    buyerSubmittedAt: "20/10/2026 · 19:22",
    sellerResponse:
      "Tôi đã giao vé đúng theo quy trình. Tôi không sử dụng vé này và không thể truy cập QR code của người mua.",
    sellerVideo: "evidence_seller_blackpink.mp4",
    sellerRespondedAt: "20/10/2026 · 20:05",
  },
  {
    id: "D-2026-002",
    ticketTitle: "Anh Trai Vượt Ngàn Chông Gai – Đêm Gala 2026",
    tier: "VIP",
    amount: 3200000,
    status: "appealing",
    buyerName: "Trần L.",
    buyerReason: "Vé không hợp lệ / sai sự kiện",
    buyerDetail:
      "QR code xuất ra nhưng BTC quét thông báo 'Vé không thuộc sự kiện này'. Hạng vé trên vé ghi VIP nhưng khu vực thực tế là Hạng B.",
    buyerVideo: "evidence_buyer_anhtrai.mp4",
    buyerSubmittedAt: "05/11/2026 · 20:10",
    sellerResponse: "Tôi không biết lý do vé sai. Tôi mua vé từ nguồn chính thức.",
    sellerVideo: "evidence_seller_anhtrai.mp4",
    sellerRespondedAt: "05/11/2026 · 21:30",
    ruling:
      "Sau khi xem xét bằng chứng video của cả hai bên, Admin xác nhận lỗi thuộc phía người bán do cung cấp vé không đúng hạng. SafePass hoàn tiền toàn bộ 3,200,000đ cho người mua.",
    ruledAt: "06/11/2026 · 09:00",
    sellerAppeal: {
      reason:
        "Tôi có lịch sử giao dịch mua vé gốc từ BTC và ảnh chụp vé gốc trước khi bán. Vé đã đúng hạng VIP khi tôi giao.",
      video: "appeal_seller_anhtrai.mp4",
      submittedAt: "06/11/2026 · 11:00",
    },
  },
  {
    id: "D-2026-003",
    ticketTitle: "Sơn Tùng M-TP – Sky Tour Live",
    tier: "Gold",
    amount: 1700000,
    status: "final_buyer",
    buyerName: "Lê K.",
    buyerReason: "Vé bị trùng / bán cho nhiều người",
    buyerDetail:
      "Lúc tôi quét, hệ thống báo đã có 1 người quét trước đó cùng vé này. Người bán đã bán vé trùng cho 2 người.",
    buyerVideo: "evidence_buyer_sontung.mp4",
    buyerSubmittedAt: "22/11/2026 · 20:30",
    sellerResponse: "Tôi chỉ bán vé này cho 1 người duy nhất qua SafePass. Tôi không có bản sao nào khác.",
    sellerVideo: "evidence_seller_sontung.mp4",
    sellerRespondedAt: "22/11/2026 · 22:10",
    ruling:
      "Không đủ bằng chứng để xác định lỗi. SafePass không thể xử lý trường hợp này. Tiền sẽ được giải ngân cho người bán sau 48h.",
    ruledAt: "23/11/2026 · 10:00",
    buyerAppeal: {
      reason:
        "Tôi có thêm ảnh chụp màn hình hệ thống BTC hiển thị lỗi vé trùng với timestamp khớp với video của tôi.",
      video: "appeal_buyer_sontung.mp4",
      submittedAt: "23/11/2026 · 11:30",
    },
    sellerAppeal: {
      reason:
        "Tôi cũng kháng cáo để làm rõ tôi không có liên quan đến việc vé bị trùng. Có thể hệ thống BTC lỗi kỹ thuật.",
      submittedAt: "23/11/2026 · 13:00",
    },
    finalRuling:
      "Sau khi xem xét toàn bộ bằng chứng kháng cáo từ 2 bên, Admin xác nhận lỗi kỹ thuật từ phía hệ thống BTC. SafePass hoàn tiền toàn bộ 1,700,000đ cho người mua từ quỹ bảo vệ. Người bán không bị phạt.",
    finalAt: "25/11/2026 · 09:00",
  },
  {
    id: "D-2026-004",
    ticketTitle: "Saigon Electronic Music Festival 2026",
    tier: "VIP Lounge",
    amount: 980000,
    status: "pending_seller",
    buyerName: "Phạm A.",
    buyerReason: "Vé không vào được / QR lỗi",
    buyerDetail:
      "Tôi quét QR tại cổng nhưng máy đọc báo lỗi liên tục. Nhân viên BTC xác nhận QR không hợp lệ và không cho vào. Tôi đứng ở đó hơn 20 phút.",
    buyerVideo: "evidence_buyer_saigon_edm.mp4",
    buyerSubmittedAt: "15/12/2026 · 18:35",
  },
  {
    id: "D-2026-005",
    ticketTitle: "Anh Trai Vượt Ngàn Chông Gai – Đêm Gala 2026",
    tier: "Hạng B",
    amount: 2100000,
    status: "ruled_seller",
    buyerName: "Hoàng V.",
    buyerReason: "Vé đã được quét trước khi tôi dùng",
    buyerDetail:
      "Máy quét BTC báo vé đã được sử dụng lúc 18:55. Tôi đến cổng lúc 19:10, chưa vào lần nào. Người bán đã sử dụng vé hoặc cung cấp bản sao.",
    buyerVideo: "evidence_buyer_anhtrai_b.mp4",
    buyerSubmittedAt: "05/11/2026 · 19:15",
    sellerResponse:
      "Tôi không hề sử dụng vé này. Vé được mua qua kênh chính thức và tôi đã chuyển nguyên file gốc cho người mua qua SafePass. Tôi có toàn bộ lịch sử giao dịch trong app.",
    sellerVideo: "evidence_seller_anhtrai_b.mp4",
    sellerRespondedAt: "05/11/2026 · 21:00",
    ruling:
      "Sau khi xem xét, Admin xác nhận video người mua quay rõ thông báo 'Vé đã sử dụng' tại cổng. Tuy nhiên không đủ bằng chứng xác định ai đã quét trước. SafePass phán quyết giải ngân cho người bán và hoàn 50% cho người mua từ quỹ bảo vệ.",
    ruledAt: "06/11/2026 · 10:30",
  },
];

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG_VI: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_seller: { label: "Chờ người bán phản hồi", color: "#FBBF24", bg: "rgba(251,191,36,0.1)", icon: "⏳" },
  under_review:   { label: "Admin đang xem xét",     color: "#60A5FA", bg: "rgba(96,165,250,0.1)",  icon: "🔍" },
  ruled_buyer:    { label: "Phán quyết: Hoàn tiền",  color: "#A3E635", bg: "rgba(163,230,53,0.1)", icon: "✅" },
  ruled_seller:   { label: "Phán quyết: Giải ngân",  color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", icon: "⚖️" },
  appealing:      { label: "Đang kháng cáo",          color: "#F472B6", bg: "rgba(244,114,182,0.1)", icon: "📢" },
  final_buyer:    { label: "Phán quyết cuối: Hoàn tiền", color: "#A3E635", bg: "rgba(163,230,53,0.1)", icon: "🏁" },
  final_seller:   { label: "Phán quyết cuối: Giải ngân", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", icon: "🏁" },
};

const STATUS_CONFIG_EN: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_seller: { label: "Awaiting seller response", color: "#FBBF24", bg: "rgba(251,191,36,0.1)", icon: "⏳" },
  under_review:   { label: "Admin reviewing",           color: "#60A5FA", bg: "rgba(96,165,250,0.1)", icon: "🔍" },
  ruled_buyer:    { label: "Ruling: Refunded",           color: "#A3E635", bg: "rgba(163,230,53,0.1)", icon: "✅" },
  ruled_seller:   { label: "Ruling: Released",           color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", icon: "⚖️" },
  appealing:      { label: "Under appeal",               color: "#F472B6", bg: "rgba(244,114,182,0.1)", icon: "📢" },
  final_buyer:    { label: "Final: Refunded",            color: "#A3E635", bg: "rgba(163,230,53,0.1)", icon: "🏁" },
  final_seller:   { label: "Final: Released",            color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", icon: "🏁" },
};

// ─── VideoChip ─────────────────────────────────────────────────────────────────

function VideoChip({ name }: { name: string }) {
  const { t } = useApp();
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}
    >
      <span>🎥</span>
      <span className="text-xs font-display font-700" style={{ color: "#93C5FD" }}>{name}</span>
      <span className="text-xs" style={{ color: "#4b5563" }}>{t.dcVerified}</span>
    </div>
  );
}

// ─── TimelineStep ──────────────────────────────────────────────────────────────

function TimelineStep({
  n,
  label,
  done,
  active,
  last,
}: {
  n: number;
  label: string;
  done: boolean;
  active: boolean;
  last: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-800 shrink-0"
          style={{
            background: done
              ? "#A3E635"
              : active
              ? "linear-gradient(135deg,#7C3AED,#A855F7)"
              : "#1e1e30",
            color: done ? "#000" : "#fff",
          }}
        >
          {done ? "✓" : n}
        </div>
        {!last && (
          <div
            className="w-0.5 flex-1 mt-1"
            style={{ background: done ? "#7C3AED" : "#1e1e30", minHeight: "24px" }}
          />
        )}
      </div>
      <p
        className="text-sm pt-0.5 pb-4"
        style={{
          color: active ? "#fff" : done ? "#A3E635" : "#4b5563",
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: done || active ? 700 : 400,
        }}
      >
        {label}
      </p>
    </div>
  );
}

// ─── AppealPanel ───────────────────────────────────────────────────────────────

function AppealPanel({
  side,
  appeal,
  canAppeal,
  onAppeal,
}: {
  side: "buyer" | "seller";
  appeal?: BuyerAppeal | SellerAppeal;
  canAppeal: boolean;
  onAppeal: () => void;
}) {
  const { t, lang } = useApp();
  const isBuyer = side === "buyer";
  const icon = isBuyer ? "🛒" : "🎟️";
  const label = isBuyer ? t.dcBuyerStep : t.dcSellerStep;
  const color = isBuyer ? "#F87171" : "#A78BFA";
  const bg = isBuyer ? "rgba(248,113,113,0.1)" : "rgba(139,92,246,0.12)";

  if (appeal) {
    return (
      <div className="sp-card p-5" style={{ border: "1px solid rgba(244,114,182,0.2)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: bg }}
          >
            {icon}
          </div>
          <h3 className="font-display font-700 text-sm" style={{ color }}>
            {t.dcAppealLabel.replace("📢 ", "")} — {label}
          </h3>
          <span className="text-xs" style={{ color: "#4b5563" }}>
            · {appeal.submittedAt}
          </span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ background: "#0a0a14" }}>
            <p className="sp-filter-label mb-1">{t.dcClaimReason}</p>
            <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
              {appeal.reason}
            </p>
          </div>
          {appeal.video && (
            <div>
              <p className="sp-filter-label mb-1.5">{t.additionalEvidence}</p>
              <VideoChip name={appeal.video} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (canAppeal) {
    return (
      <div
        className="p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap"
        style={{ background: "rgba(244,114,182,0.04)", border: "1px dashed rgba(244,114,182,0.25)" }}
      >
        <div>
          <p className="text-sm font-display font-700 text-white">
            {icon} {label} {lang === "en" ? "has not appealed" : "chưa kháng cáo"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            {lang === "en" ? "24 hours remaining to submit appeal." : "Còn 24 giờ để nộp kháng cáo."}
          </p>
        </div>
        <button
          onClick={onAppeal}
          className="sp-btn-ghost text-xs px-4 py-2 font-display font-700 shrink-0"
          style={{ borderColor: "rgba(244,114,182,0.35)", color: "#F472B6" }}
        >
          {lang === "en" ? "📢 Appeal" : "📢 Kháng cáo"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl" style={{ background: "#0a0a14" }}>
      <p className="text-xs" style={{ color: "#4b5563" }}>
        {icon} {label} {lang === "en" ? "did not appeal." : "không kháng cáo."}
      </p>
    </div>
  );
}

// ─── DisputeDetailCard ─────────────────────────────────────────────────────────

function DisputeDetailCard({
  dispute,
  role,
  onAppeal,
  onSellerRespond,
}: {
  dispute: Dispute;
  role: "buyer" | "seller";
  onAppeal: (side: "buyer" | "seller", dispute: Dispute) => void;
  onSellerRespond: (dispute: Dispute) => void;
}) {
  const { lang, t } = useApp();
  const STATUS_CONFIG = lang === "en" ? STATUS_CONFIG_EN : STATUS_CONFIG_VI;
  const statusCfg = STATUS_CONFIG[dispute.status];
  const fmt = (v: number) => v.toLocaleString("vi-VN") + " VND";
  const hasRuling = !!dispute.ruling;
  const isFinal = dispute.status === "final_buyer" || dispute.status === "final_seller";
  const isAppealing = dispute.status === "appealing" || isFinal;

  const steps = lang === "en" ? [
    { label: "Buyer reports issue", done: true, active: false },
    { label: "Seller responds with counter-evidence", done: !!dispute.sellerResponse, active: dispute.status === "pending_seller" },
    { label: "Admin reviews both sides' evidence", done: hasRuling, active: dispute.status === "under_review" },
    { label: "Appeal — one chance per side", done: isFinal, active: isAppealing && !isFinal },
    { label: "Final ruling", done: isFinal, active: false },
  ] : [
    { label: "Người mua báo cáo sự cố", done: true, active: false },
    { label: "Người bán phản hồi & nộp bằng chứng", done: !!dispute.sellerResponse, active: dispute.status === "pending_seller" },
    { label: "Admin xem xét bằng chứng 2 bên", done: hasRuling, active: dispute.status === "under_review" },
    { label: "Kháng cáo — mỗi bên 1 lần (nếu có)", done: isFinal, active: isAppealing && !isFinal },
    { label: "Phán quyết cuối cùng", done: isFinal, active: false },
  ];

  const isSellerPending = role === "seller" && dispute.status === "pending_seller";
  const buyerCanAppeal = hasRuling && !isFinal && !dispute.buyerAppeal;
  const sellerCanAppeal = hasRuling && !isFinal && !dispute.sellerAppeal;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="sp-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-xs font-display font-700 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA" }}
              >
                {dispute.id}
              </span>
              <span
                className="text-xs font-display font-700 px-2.5 py-1 rounded-full"
                style={{ color: statusCfg.color, background: statusCfg.bg }}
              >
                {statusCfg.icon} {statusCfg.label}
              </span>
            </div>
            <h2 className="font-display font-800 text-white text-base">{dispute.ticketTitle}</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              {dispute.tier} · {fmt(dispute.amount)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="sp-filter-label">{t.dcDisputeAmt}</p>
            <p className="font-display font-800 text-white text-xl">{fmt(dispute.amount)}</p>
          </div>
        </div>

        <div className="pt-3 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="sp-filter-label mb-3">{t.dcProgress}</p>
          {steps.map((step, idx) => (
            <TimelineStep
              key={idx}
              n={idx + 1}
              label={step.label}
              done={step.done}
              active={step.active}
              last={idx === steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Buyer evidence */}
      <div className="sp-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: "rgba(248,113,113,0.12)" }}
          >
            🛒
          </div>
          <h3 className="font-display font-700 text-white text-sm">{t.dcBuyerEvidence}</h3>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-display font-700"
            style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24" }}
          >
            Lần 1
          </span>
          <span className="text-xs" style={{ color: "#4b5563" }}>
            · {dispute.buyerSubmittedAt}
          </span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ background: "#0a0a14" }}>
            <p className="sp-filter-label mb-1">{t.dcClaimReason}</p>
            <p className="text-sm text-white font-600">{dispute.buyerReason}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "#0a0a14" }}>
            <p className="sp-filter-label mb-1">{t.dcClaimDetail}</p>
            <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
              {dispute.buyerDetail}
            </p>
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">{t.dcVideoProof}</p>
            <VideoChip name={dispute.buyerVideo} />
          </div>
        </div>
      </div>

      {/* Seller response / pending */}
      {dispute.sellerResponse ? (
        <div className="sp-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: "rgba(139,92,246,0.12)" }}
            >
              🎟️
            </div>
            <h3 className="font-display font-700 text-white text-sm">{t.dcSellerResponse}</h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-display font-700"
              style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24" }}
            >
              Lần 1
            </span>
            <span className="text-xs" style={{ color: "#4b5563" }}>
              · {dispute.sellerRespondedAt}
            </span>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl" style={{ background: "#0a0a14" }}>
              <p className="sp-filter-label mb-1">{t.dcSellerArg}</p>
              <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                {dispute.sellerResponse}
              </p>
            </div>
            {dispute.sellerVideo && (
              <div>
                <p className="sp-filter-label mb-1.5">{t.dcVideoCounter}</p>
                <VideoChip name={dispute.sellerVideo} />
              </div>
            )}
          </div>
        </div>
      ) : isSellerPending ? (
        <div className="sp-card p-5" style={{ border: "1px solid rgba(251,191,36,0.3)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <h3 className="font-display font-700 text-amber-400 text-sm">
              {t.dcSellerPendingTitle}
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
            {t.dcSellerPendingDesc.split("**").map((p, i) => i % 2 === 1 ? <strong key={i} className="text-amber-400">{p}</strong> : p)}
          </p>
          <button
            onClick={() => onSellerRespond(dispute)}
            className="sp-btn-primary py-2.5 px-5 font-display font-700"
          >
            {t.dcSubmitEvidence}
          </button>
        </div>
      ) : (
        <div className="sp-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: "rgba(251,191,36,0.1)" }}
            >
              ⏳
            </div>
            <h3 className="font-display font-700 text-white text-sm">{t.dcWaitingSeller}</h3>
          </div>
          <p className="text-xs" style={{ color: "#6b7280" }}>{t.dcWaitingSellerSub}</p>
        </div>
      )}

      {/* Admin ruling */}
      {dispute.ruling && (
        <div className="sp-card p-5" style={{ border: "1px solid rgba(96,165,250,0.25)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: "rgba(96,165,250,0.12)" }}
            >
              ⚖️
            </div>
            <h3 className="font-display font-700 text-blue-400 text-sm">
              {t.dcAdminRuling}
            </h3>
            {dispute.ruledAt && (
              <span className="text-xs" style={{ color: "#4b5563" }}>
                · {dispute.ruledAt}
              </span>
            )}
          </div>
          <div
            className="p-4 rounded-xl mb-4"
            style={{
              background: "rgba(96,165,250,0.06)",
              border: "1px solid rgba(96,165,250,0.12)",
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "#e5e7eb" }}>
              {dispute.ruling}
            </p>
          </div>

          {!isFinal && (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 pb-1"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-xs font-display font-700" style={{ color: "#6b7280" }}>
                  {t.dcAppealLabel}
                </span>
              </div>
              <AppealPanel
                side="buyer"
                appeal={dispute.buyerAppeal}
                canAppeal={buyerCanAppeal && role === "buyer"}
                onAppeal={() => onAppeal("buyer", dispute)}
              />
              <AppealPanel
                side="seller"
                appeal={dispute.sellerAppeal}
                canAppeal={sellerCanAppeal && role === "seller"}
                onAppeal={() => onAppeal("seller", dispute)}
              />
              {(buyerCanAppeal || sellerCanAppeal) && (
                <p className="text-xs text-center pt-1" style={{ color: "#4b5563" }}>
                  Sau khi nhận đủ kháng cáo từ cả 2 bên, Admin sẽ đưa ra phán quyết cuối cùng
                  trong 48h.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Final ruling */}
      {dispute.finalRuling && (
        <div className="sp-card p-5" style={{ border: "1px solid rgba(163,230,53,0.25)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: "rgba(163,230,53,0.12)" }}
            >
              🏁
            </div>
            <h3 className="font-display font-700 text-lime-400 text-sm">{t.dcFinalRuling}</h3>
            {dispute.finalAt && (
              <span className="text-xs" style={{ color: "#4b5563" }}>
                · {dispute.finalAt}
              </span>
            )}
          </div>
          <div
            className="p-4 rounded-xl mb-3"
            style={{
              background: "rgba(163,230,53,0.06)",
              border: "1px solid rgba(163,230,53,0.12)",
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "#e5e7eb" }}>
              {dispute.finalRuling}
            </p>
          </div>
          <p className="text-xs text-center" style={{ color: "#4b5563" }}>{t.dcFinalNote}</p>
        </div>
      )}
    </div>
  );
}

// ─── SellerResponseForm ────────────────────────────────────────────────────────

function SellerResponseForm({ dispute, onDone }: { dispute: Dispute; onDone: () => void }) {
  const [text, setText] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="sp-card p-10 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="font-display font-800 text-white text-lg mb-2">Bằng chứng đã được nộp</h2>
        <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>
          Admin SafePass sẽ xem xét bằng chứng 2 bên và phán quyết trong vòng 24 giờ.
        </p>
        <button onClick={onDone} className="sp-btn-primary px-6 py-2.5 font-display font-700">
          Xem tiến trình →
        </button>
      </div>
    );
  }

  return (
    <div className="sp-card p-6 space-y-5">
      <div>
        <h2 className="font-display font-800 text-white text-lg mb-1">Nộp bằng chứng phản hồi</h2>
        <p className="text-xs" style={{ color: "#6b7280" }}>
          Đây là lần nộp bằng chứng đầu tiên (lần 1/2). Bạn còn 1 lần kháng cáo sau phán quyết.
        </p>
      </div>

      <div
        className="p-3.5 rounded-xl"
        style={{
          background: "rgba(248,113,113,0.07)",
          border: "1px solid rgba(248,113,113,0.2)",
        }}
      >
        <p className="text-xs font-700 text-red-400 mb-1">Khiếu nại: {dispute.buyerReason}</p>
        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
          {dispute.buyerDetail}
        </p>
      </div>

      <div>
        <p className="sp-filter-label mb-2">Lập luận của bạn</p>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="sp-input"
          placeholder="Giải thích tại sao vé của bạn hợp lệ, bạn đã thực hiện giao dịch đúng quy trình như thế nào..."
        />
      </div>

      <div>
        <p className="sp-filter-label mb-1.5">Video bằng chứng phản biện (không cắt ghép) *</p>
        <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>
          Quay video từ lúc bạn xem vé trong hệ thống → thể hiện QR chỉ có 1 bản → mọi thao tác
          liên quan đến vé này.
        </p>
        <label className="block cursor-pointer">
          <div
            className="h-32 rounded-xl flex flex-col items-center justify-center transition-all"
            style={{
              border: videoFile
                ? "2px solid rgba(163,230,53,0.5)"
                : "2px dashed rgba(139,92,246,0.3)",
              background: "#0a0a14",
            }}
          >
            {videoFile ? (
              <div className="text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-sm font-display font-700 text-lime-400 px-3 line-clamp-1">
                  {videoFile.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                  Nhấn để đổi
                </p>
              </div>
            ) : (
              <>
                <span className="text-2xl mb-1.5">🎥</span>
                <p className="text-sm font-600 text-white">Chọn video phản biện</p>
                <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                  MP4, MOV — tối đa 500MB
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
          />
        </label>
      </div>

      <button
        onClick={() => setSubmitted(true)}
        disabled={!text.trim() || !videoFile}
        className="w-full sp-btn-primary py-3 font-display font-700"
      >
        📤 Nộp bằng chứng phản hồi (Lần 1)
      </button>
    </div>
  );
}

// ─── AppealForm ────────────────────────────────────────────────────────────────

function AppealForm({
  side,
  dispute,
  onDone,
}: {
  side: "buyer" | "seller";
  dispute: Dispute;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const roleLabel = side === "buyer" ? "người mua" : "người bán";

  if (submitted) {
    return (
      <div className="sp-card p-10 text-center">
        <div className="text-4xl mb-3">📢</div>
        <h2 className="font-display font-800 text-white text-lg mb-2">Kháng cáo đã được gửi</h2>
        <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>
          Đây là lần nộp bằng chứng thứ 2 của bạn. Admin sẽ xem xét kháng cáo từ cả 2 bên và đưa
          ra <strong className="text-pink-400">phán quyết cuối cùng</strong> trong 48 giờ.
        </p>
        <button onClick={onDone} className="sp-btn-primary px-6 py-2.5 font-display font-700">
          Xem tiến trình →
        </button>
      </div>
    );
  }

  return (
    <div className="sp-card p-6 space-y-5">
      <div>
        <h2 className="font-display font-800 text-white text-lg mb-1">Kháng cáo phán quyết</h2>
        <p className="text-xs" style={{ color: "#9ca3af" }}>
          Đây là lần nộp bằng chứng thứ 2 của {roleLabel}. Sau khi Admin xem xét kháng cáo từ cả 2
          bên sẽ đưa ra phán quyết cuối cùng và không thể kháng cáo thêm.
        </p>
      </div>

      <div
        className="p-3.5 rounded-xl"
        style={{
          background: "rgba(96,165,250,0.06)",
          border: "1px solid rgba(96,165,250,0.15)",
        }}
      >
        <p className="text-xs font-700 text-blue-400 mb-1">⚖️ Phán quyết cần kháng cáo</p>
        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
          {dispute.ruling}
        </p>
      </div>

      <div>
        <p className="sp-filter-label mb-2">Lý do kháng cáo *</p>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="sp-input"
          placeholder="Giải thích tại sao bạn không đồng ý với phán quyết. Cung cấp thông tin hoặc bằng chứng mới mà Admin chưa xem xét..."
        />
      </div>

      <div>
        <p className="sp-filter-label mb-1.5">Bằng chứng bổ sung (video không cắt ghép)</p>
        <label className="block cursor-pointer">
          <div
            className="h-32 rounded-xl flex flex-col items-center justify-center transition-all"
            style={{
              border: videoFile
                ? "2px solid rgba(163,230,53,0.5)"
                : "2px dashed rgba(244,114,182,0.3)",
              background: "#0a0a14",
            }}
          >
            {videoFile ? (
              <div className="text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-sm font-display font-700 text-lime-400 px-3 line-clamp-1">
                  {videoFile.name}
                </p>
              </div>
            ) : (
              <>
                <span className="text-2xl mb-1.5">🎥</span>
                <p className="text-sm font-600 text-white">Bằng chứng bổ sung (nếu có)</p>
                <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                  MP4, MOV — tối đa 500MB
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
          />
        </label>
      </div>

      <button
        onClick={() => setSubmitted(true)}
        disabled={!text.trim()}
        className="w-full py-3 rounded-xl font-display font-700 text-white text-sm"
        style={{ background: "linear-gradient(135deg,#9D174D,#EC4899)" }}
      >
        📢 Gửi kháng cáo (Lần 2)
      </button>
    </div>
  );
}

// ─── DisputeCenter (default export) ───────────────────────────────────────────

export default function DisputeCenter() {
  const { nav, role, pendingDisputes, t, lang } = useApp();
  const STATUS_CONFIG = lang === "en" ? STATUS_CONFIG_EN : STATUS_CONFIG_VI;
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [view, setView] = useState<"list" | "detail" | "seller-respond" | "appeal">("list");
  const [appealSide, setAppealSide] = useState<"buyer" | "seller">("buyer");

  const isSeller = role === "seller";

  const dynamicAsDisputes: Dispute[] = pendingDisputes.map(pd => ({
    id: pd.id,
    ticketTitle: pd.ticketTitle,
    tier: pd.tier,
    amount: pd.amount,
    status: "under_review",
    buyerName: "Bạn",
    buyerReason: pd.buyerReason,
    buyerDetail: pd.buyerDetail,
    buyerVideo: pd.buyerVideo,
    buyerSubmittedAt: pd.buyerSubmittedAt,
  }));

  // Tài khoản người dùng sẽ hiển thị sạch các tranh chấp của chính họ, không gộp mẫu DISPUTES của người khác
  const visibleDisputes = dynamicAsDisputes;

  // Seller-respond view
  if (view === "seller-respond" && selectedDispute) {
    return (
      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("detail")} className="sp-btn-ghost text-xs px-3 py-1.5">
            {t.backBtn}
          </button>
          <h1 className="font-display font-800 text-white text-xl">{t.dcSellerResponse}</h1>
        </div>
        <SellerResponseForm dispute={selectedDispute} onDone={() => setView("detail")} />
      </div>
    );
  }

  // Appeal view
  if (view === "appeal" && selectedDispute) {
    return (
      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("detail")} className="sp-btn-ghost text-xs px-3 py-1.5">
            {t.backBtn}
          </button>
          <h1 className="font-display font-800 text-white text-xl">{t.dcAppealLabel}</h1>
        </div>
        <AppealForm side={appealSide} dispute={selectedDispute} onDone={() => setView("detail")} />
      </div>
    );
  }

  // Detail view
  if (view === "detail" && selectedDispute) {
    const statusCfg = STATUS_CONFIG[selectedDispute.status];
    return (
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("list")} className="sp-btn-ghost text-xs px-3 py-1.5">
            ← {t.dcListTitle}
          </button>
          <div>
            <h1 className="font-display font-800 text-white text-xl">{t.dcDetailTitle}</h1>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              {selectedDispute.id}
            </p>
          </div>
          <span
            className="ml-auto text-xs font-display font-700 px-2.5 py-1 rounded-full"
            style={{ color: statusCfg.color, background: statusCfg.bg }}
          >
            {statusCfg.icon} {statusCfg.label}
          </span>
        </div>
        <DisputeDetailCard
          dispute={selectedDispute}
          role={isSeller ? "seller" : "buyer"}
          onAppeal={(side, dispute) => {
            setSelectedDispute(dispute);
            setAppealSide(side);
            setView("appeal");
          }}
          onSellerRespond={(dispute) => {
            setSelectedDispute(dispute);
            setView("seller-respond");
          }}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-[1680px] mx-auto px-5 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => nav(isSeller ? "seller-dash" : "my-tickets")}
          className="sp-btn-ghost text-xs px-3 py-1.5 font-display font-700 shrink-0"
        >
          ← {isSeller ? t.dcBackSeller : t.dcBackBuyer}
        </button>
        <div className="flex-1">
          <h1 className="font-display font-800 text-white text-2xl">{t.dcTitle}</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
            {isSeller ? t.dcSubSeller : t.dcSubBuyer}
          </p>
        </div>
      </div>

      <div
        className="mb-6 p-4 rounded-xl flex items-start gap-3"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <span className="text-xl shrink-0">⚡</span>
        <div>
          <p className="text-sm font-display font-700 text-red-400 mb-1">Cơ chế bảo vệ Fast-Track Escrow (15 - 30 Phút Sát Giờ Diễn)</p>
          <p className="text-xs leading-relaxed text-gray-300">
            • <strong>Sự cố tại cổng soát vé (trước show 2 giờ):</strong> Hệ thống đóng băng tiền ngay lập tức. Admin xác minh video quay cổng soát vé và ra phán quyết trong <strong>15 - 30 phút</strong> để bạn kịp mua vé thay thế hoặc nhận hoàn tiền 100%.<br/>
            • <strong>Sự cố thông thường:</strong> Người bán có tối đa <strong>2 giờ</strong> để cung cấp bằng chứng đối chất. Quá hạn tự động hoàn tiền cho người mua.
          </p>
        </div>
      </div>

      {visibleDisputes.length === 0 ? (
        <div className="sp-card p-16 text-center">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="font-display font-700 text-white mb-1">{t.dcEmpty}</p>
          <p className="text-sm" style={{ color: "#6b7280" }}>{t.dcEmptySub}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDisputes.map((dispute) => {
            const statusCfg = STATUS_CONFIG[dispute.status];
            const fmt = (v: number) => v.toLocaleString("vi-VN") + " VND";
            const needsAction = dispute.status === "pending_seller" && isSeller;
            return (
              <div
                key={dispute.id}
                onClick={() => {
                  setSelectedDispute(dispute);
                  setView("detail");
                }}
                className="sp-card p-5 cursor-pointer transition-all"
                style={{ border: needsAction ? "1px solid rgba(251,191,36,0.4)" : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-display font-700" style={{ color: "#6b7280" }}>
                        {dispute.id}
                      </span>
                      <span
                        className="text-xs font-display font-700 px-2 py-0.5 rounded-full"
                        style={{ color: statusCfg.color, background: statusCfg.bg }}
                      >
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      {needsAction && (
                        <span
                          className="text-xs font-display font-700 px-2 py-0.5 rounded-full animate-pulse"
                          style={{ color: "#FBBF24", background: "rgba(251,191,36,0.15)" }}
                        >
                          {t.dcNeedsAction}
                        </span>
                      )}
                    </div>
                    <p className="font-display font-700 text-white text-sm mb-0.5">
                      {dispute.ticketTitle}
                    </p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      {dispute.tier} · {dispute.buyerReason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-800 text-white">{fmt(dispute.amount)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                      {dispute.buyerSubmittedAt}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
