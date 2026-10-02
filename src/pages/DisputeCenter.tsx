import { useState, useEffect } from "react";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

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

function TimelineStep({ n, label, done, active, last }: { n: number; label: string; done: boolean; active: boolean; last: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-800 shrink-0"
          style={{
            background: done ? "#A3E635" : active ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "#1e1e30",
            color: done ? "#000" : "#fff",
          }}
        >
          {done ? "✓" : n}
        </div>
        {!last && <div className="w-0.5 flex-1 mt-1" style={{ background: done ? "#7C3AED" : "#1e1e30", minHeight: "24px" }} />}
      </div>
      <p className="text-sm pt-0.5 pb-4" style={{ color: active ? "#fff" : done ? "#A3E635" : "#4b5563", fontWeight: done || active ? 700 : 400 }}>
        {label}
      </p>
    </div>
  );
}

function AppealPanel({ side, appeal, canAppeal, onAppeal }: { side: "buyer" | "seller"; appeal?: BuyerAppeal | SellerAppeal; canAppeal: boolean; onAppeal: () => void }) {
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
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: bg }}>{icon}</div>
          <h3 className="font-display font-700 text-sm" style={{ color }}>{t.dcAppealLabel.replace("📢 ", "")} — {label}</h3>
          <span className="text-xs text-gray-500">· {appeal.submittedAt}</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-[#0a0a14]">
            <p className="sp-filter-label mb-1">{t.dcClaimReason}</p>
            <p className="text-sm text-gray-400 leading-relaxed">{appeal.reason}</p>
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
      <div className="p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap" style={{ background: "rgba(244,114,182,0.04)", border: "1px dashed rgba(244,114,182,0.25)" }}>
        <div>
          <p className="text-sm font-display font-700 text-white">{icon} {label} {lang === "en" ? "has not appealed" : "chưa kháng cáo"}</p>
          <p className="text-xs text-gray-400 mt-0.5">{lang === "en" ? "24 hours remaining to submit appeal." : "Còn 24 giờ để nộp kháng cáo."}</p>
        </div>
        <button onClick={onAppeal} className="sp-btn-ghost text-xs px-4 py-2 font-display font-700 shrink-0" style={{ borderColor: "rgba(244,114,182,0.35)", color: "#F472B6" }}>
          {lang === "en" ? "📢 Appeal" : "📢 Kháng cáo"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-[#0a0a14]">
      <p className="text-xs text-gray-500">{icon} {label} {lang === "en" ? "did not appeal." : "không kháng cáo."}</p>
    </div>
  );
}

function DisputeDetailCard({ dispute, role, onAppeal, onSellerRespond }: { dispute: Dispute; role: "buyer" | "seller"; onAppeal: (side: "buyer" | "seller", dispute: Dispute) => void; onSellerRespond: (dispute: Dispute) => void }) {
  const { lang, t } = useApp();
  const STATUS_CONFIG = lang === "en" ? STATUS_CONFIG_EN : STATUS_CONFIG_VI;
  const statusCfg = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.under_review;
  const fmt = (v: number) => v.toLocaleString("vi-VN") + " VND";
  const hasRuling = !!dispute.ruling;
  const isFinal = dispute.status === "final_buyer" || dispute.status === "final_seller";
  const isAppealing = dispute.status === "appealing" || isFinal;

  const steps = [
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
      <div className="sp-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-display font-700 px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA" }}>{dispute.id}</span>
              <span className="text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                {statusCfg.icon} {statusCfg.label}
              </span>
            </div>
            <h2 className="font-display font-800 text-white text-base">{dispute.ticketTitle}</h2>
            <p className="text-xs mt-0.5 text-gray-400">{dispute.tier} · {fmt(dispute.amount)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="sp-filter-label">{t.dcDisputeAmt}</p>
            <p className="font-display font-800 text-white text-xl">{fmt(dispute.amount)}</p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-white/5">
          <p className="sp-filter-label mb-3">{t.dcProgress}</p>
          {steps.map((step, idx) => (
            <TimelineStep key={idx} n={idx + 1} label={step.label} done={step.done} active={step.active} last={idx === steps.length - 1} />
          ))}
        </div>
      </div>

      <div className="sp-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-red-500/10">🛒</div>
          <h3 className="font-display font-700 text-white text-sm">{t.dcBuyerEvidence}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded font-display font-700 text-amber-400 bg-amber-400/10">Lần 1</span>
          <span className="text-xs text-gray-500">· {dispute.buyerSubmittedAt}</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-[#0a0a14]">
            <p className="sp-filter-label mb-1">{t.dcClaimReason}</p>
            <p className="text-sm text-white font-600">{dispute.buyerReason}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#0a0a14]">
            <p className="sp-filter-label mb-1">{t.dcClaimDetail}</p>
            <p className="text-sm leading-relaxed text-gray-300">{dispute.buyerDetail}</p>
          </div>
          <div>
            <p className="sp-filter-label mb-1.5">{t.dcVideoProof}</p>
            <VideoChip name={dispute.buyerVideo} />
          </div>
        </div>
      </div>

      {dispute.sellerResponse ? (
        <div className="sp-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-purple-500/10">🎟️</div>
            <h3 className="font-display font-700 text-white text-sm">{t.dcSellerResponse}</h3>
            <span className="text-xs px-1.5 py-0.5 rounded font-display font-700 text-amber-400 bg-amber-400/10">Lần 1</span>
            <span className="text-xs text-gray-500">· {dispute.sellerRespondedAt}</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#0a0a14]">
              <p className="sp-filter-label mb-1">{t.dcSellerArg}</p>
              <p className="text-sm leading-relaxed text-gray-300">{dispute.sellerResponse}</p>
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
        <div className="sp-card p-5 border border-amber-400/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <h3 className="font-display font-700 text-amber-400 text-sm">{t.dcSellerPendingTitle}</h3>
          </div>
          <p className="text-xs mb-4 text-gray-300">{t.dcSellerPendingDesc}</p>
          <button onClick={() => onSellerRespond(dispute)} className="sp-btn-primary py-2.5 px-5 font-display font-700">
            {t.dcSubmitEvidence}
          </button>
        </div>
      ) : (
        <div className="sp-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-amber-400/10">⏳</div>
            <h3 className="font-display font-700 text-white text-sm">{t.dcWaitingSeller}</h3>
          </div>
          <p className="text-xs text-gray-500">{t.dcWaitingSellerSub}</p>
        </div>
      )}
    </div>
  );
}

export default function DisputeCenter() {
  const { nav, role, pendingDisputes, currentUser, t, lang } = useApp();
  const STATUS_CONFIG = lang === "en" ? STATUS_CONFIG_EN : STATUS_CONFIG_VI;
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");
  const [dbDisputes, setDbDisputes] = useState<Dispute[]>([]);

  const isSeller = role === "seller";

  // Lấy dữ liệu khiếu nại trực tiếp từ Supabase Realtime
  useEffect(() => {
    async function fetchDisputes() {
      try {
        const { data, error } = await supabase
          .from("disputes")
          .select("*, tickets(*)")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped: Dispute[] = data.map((d: any) => ({
            id: String(d.id),
            ticketTitle: d.tickets?.event_name || "Vé concert",
            tier: d.tickets?.tier || "Standard",
            amount: Number(d.tickets?.price || 0),
            status: d.status || "under_review",
            buyerName: "Người mua",
            buyerReason: d.reason || "Lỗi vé",
            buyerDetail: d.description || "",
            buyerVideo: d.video_url || "evidence.mp4",
            buyerSubmittedAt: new Date(d.created_at).toLocaleString("vi-VN"),
          }));
          setDbDisputes(mapped);
        }
      } catch (err) {
        console.error("Lỗi khi tải disputes từ Supabase:", err);
      }
    }

    fetchDisputes();

    const channel = supabase
      .channel("disputes_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, () => {
        fetchDisputes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const combinedDisputes = [...dbDisputes, ...dynamicAsDisputes];
  const seenIds = new Set<string>();
  const visibleDisputes = combinedDisputes.filter(d => {
    if (seenIds.has(d.id)) return false;
    seenIds.add(d.id);
    return true;
  });

  if (view === "detail" && selectedDispute) {
    const statusCfg = STATUS_CONFIG[selectedDispute.status] || STATUS_CONFIG.under_review;
    return (
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("list")} className="sp-btn-ghost text-xs px-3 py-1.5 cursor-pointer">
            ← Quay lại danh sách
          </button>
          <div>
            <h1 className="font-display font-800 text-white text-xl">{t.dcDetailTitle}</h1>
            <p className="text-xs mt-0.5 text-gray-400">{selectedDispute.id}</p>
          </div>
          <span className="ml-auto text-xs font-display font-700 px-2.5 py-1 rounded-full" style={{ color: statusCfg.color, background: statusCfg.bg }}>
            {statusCfg.icon} {statusCfg.label}
          </span>
        </div>
        <DisputeDetailCard dispute={selectedDispute} role={isSeller ? "seller" : "buyer"} onAppeal={() => {}} onSellerRespond={() => {}} />
      </div>
    );
  }

  return (
    <div className="max-w-[1680px] mx-auto px-5 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-7">
        <button onClick={() => nav(isSeller ? "seller-dash" : "my-tickets")} className="sp-btn-ghost text-xs px-3 py-1.5 font-display font-700 shrink-0 cursor-pointer">
          ← Quay lại
        </button>
        <div className="flex-1">
          <h1 className="font-display font-800 text-white text-2xl">{t.dcTitle}</h1>
          <p className="text-sm mt-0.5 text-gray-400">{isSeller ? t.dcSubSeller : t.dcSubBuyer}</p>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-500/10 border border-red-500/20">
        <span className="text-xl shrink-0">⚡</span>
        <div>
          <p className="text-sm font-display font-700 text-red-400 mb-1">Cơ chế bảo vệ Fast-Track Escrow (15 - 30 Phút Sát Giờ Diễn)</p>
          <p className="text-xs leading-relaxed text-gray-300">
            Khi có khiếu nại khẩn cấp, dòng tiền lập tức đóng băng. Admin xác minh video cổng và ra phán quyết hoàn tiền 100% cho người mua.
          </p>
        </div>
      </div>

      {visibleDisputes.length === 0 ? (
        <div className="sp-card p-16 text-center">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="font-display font-700 text-white mb-1">{t.dcEmpty}</p>
          <p className="text-sm text-gray-400">{t.dcEmptySub}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDisputes.map((dispute) => {
            const statusCfg = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.under_review;
            const fmt = (v: number) => v.toLocaleString("vi-VN") + " VND";
            return (
              <div
                key={dispute.id}
                onClick={() => {
                  setSelectedDispute(dispute);
                  setView("detail");
                }}
                className="sp-card p-5 cursor-pointer transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-display font-700 text-gray-500">{dispute.id}</span>
                      <span className="text-xs font-display font-700 px-2 py-0.5 rounded-full" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </div>
                    <p className="font-display font-700 text-white text-sm mb-0.5">{dispute.ticketTitle}</p>
                    <p className="text-xs text-gray-400">{dispute.tier} · {dispute.buyerReason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-800 text-white">{fmt(dispute.amount)}</p>
                    <p className="text-xs mt-0.5 text-gray-500">{dispute.buyerSubmittedAt}</p>
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