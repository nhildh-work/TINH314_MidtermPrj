import { useState } from "react";
import { useApp } from "../context";
import type { PendingDispute } from "../context";

export default function Dispute() {
  const { disputeTicket, closeDispute, nav, addPendingDispute, t } = useApp();
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = reason && videoFile;

  const handleSubmit = () => {
    if (!canSubmit || !disputeTicket) return;
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
    };
    addPendingDispute(d);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🛡️</div>
        <h2 className="font-display font-800 text-white text-xl mb-2">{t.reportSentTitle}</h2>
        <p className="text-sm mb-2 leading-relaxed" style={{ color: "#9ca3af" }}>
          {t.reportSentDesc.split("**").map((p, i) => i % 2 === 1 ? <strong key={i} className="text-amber-400">{p}</strong> : p)}
        </p>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>{t.reportSentSub}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { closeDispute(); nav("dispute-center"); }} className="sp-btn-primary px-6 py-2.5 font-display font-700">
            {t.viewDisputeBtn}
          </button>
          <button onClick={() => { closeDispute(); nav("my-tickets"); }} className="sp-btn-ghost px-6 py-2.5 font-display font-700">
            {t.backToTicketsBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-8">
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => { closeDispute(); nav("my-tickets"); }} className="sp-btn-ghost text-xs px-3 py-1.5 mt-0.5">
          ←
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-800 text-white text-xl">{t.reportPageTitle}</h1>
            <span className="text-xs font-display font-700 px-2.5 py-0.5 rounded-full" style={{ color: "#F87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
              DISPUTE
            </span>
          </div>
          {disputeTicket && (
            <p className="text-sm mt-0.5" style={{ color: "#9ca3af" }}>
              {disputeTicket.eventTitle} · {disputeTicket.tier}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.22)" }}>
        <span className="text-xl shrink-0">🛡️</span>
        <div>
          <p className="text-sm font-700 text-red-400 mb-1">{t.disputeSafetyTitle}</p>
          <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{t.disputeSafetyDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="sp-card p-5 space-y-4">
          <h2 className="font-display font-700 text-white text-base">{t.claimDetails}</h2>

          <div>
            <p className="sp-filter-label mb-2">{t.claimTypeLabel}</p>
            <select value={reason} onChange={e => setReason(e.target.value)} className="sp-select">
              <option value="">{t.claimTypePh}</option>
              {(t.disputeReasons as readonly string[]).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <p className="sp-filter-label mb-2">{t.claimDetailLabel}</p>
            <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={6} className="sp-input" placeholder={t.claimDetailPh} />
          </div>
        </div>

        <div className="sp-card p-5 space-y-4">
          <h2 className="font-display font-700 text-white text-base">{t.proofTitle}</h2>

          <div className="p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <p className="text-xs font-700 text-amber-400 mb-1.5">{t.proofRequirement}</p>
            <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
              {t.proofRequirementDesc.split("**").map((p, i) => i % 2 === 1 ? <strong key={i} className="text-white">{p}</strong> : p)}
            </p>
          </div>

          <div>
            <p className="sp-filter-label mb-2">{t.uploadVideoLabel}</p>
            <label className="block cursor-pointer">
              <div className="h-36 rounded-xl flex flex-col items-center justify-center transition-all"
                style={{ border: videoFile ? "2px solid rgba(163,230,53,0.5)" : "2px dashed rgba(248,113,113,0.35)", background: "#0a0a14" }}>
                {videoFile ? (
                  <div className="text-center">
                    <p className="text-3xl mb-1.5">✅</p>
                    <p className="text-sm font-display font-700 text-lime-400 px-3 text-center line-clamp-1">{videoFile.name}</p>
                    <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{t.clickToChange2}</p>
                  </div>
                ) : (
                  <>
                    <span className="text-3xl mb-2">🎥</span>
                    <p className="text-sm font-600 text-white">{t.clickToSelectVideo}</p>
                    <p className="text-xs mt-1" style={{ color: "#4b5563" }}>{t.videoSpec}</p>
                  </>
                )}
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && setVideoFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full mt-5 py-3.5 rounded-xl font-display font-700 text-white text-sm transition-all hover:opacity-90 disabled:opacity-35"
        style={{ background: "linear-gradient(135deg,#991B1B,#DC2626)" }}
      >
        {t.submitReport}
      </button>
    </div>
  );
}
