import { useState } from "react";
import { useApp } from "../context";

type KycStep = 1 | 2 | 3 | 4;

const LIVENESS_STEPS = [
  { icon: "👁️", text: "Nhìn thẳng vào camera" },
  { icon: "😉", text: "Chớp mắt 2 lần từ từ" },
  { icon: "😊", text: "Mỉm cười tự nhiên" },
  { icon: "↩️", text: "Từ từ xoay mặt sang trái" },
];

export default function KYCFlow() {
  const { setKycStatus, nav } = useApp();
  const [step, setStep] = useState<KycStep>(1);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [livenessIdx, setLivenessIdx] = useState(0);
  const [faceChecking, setFaceChecking] = useState(false);

  const STEP_LABELS = ["Tải CCCD", "Kiểm tra ảnh", "Nhận diện khuôn mặt", "Chờ xét duyệt"];

  const handleFileUpload = (side: "front" | "back", file: File) => {
    const url = URL.createObjectURL(file);
    if (side === "front") { setFrontFile(file); setFrontPreview(url); }
    else { setBackFile(file); setBackPreview(url); }
  };

  const handleCCCDSubmit = () => {
    if (!frontFile || !backFile) return;
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setStep(2); }, 2200);
  };

  const handleStep2Next = () => setStep(3);

  const handleLiveness = () => {
    if (livenessIdx < LIVENESS_STEPS.length - 1) {
      setLivenessIdx(i => i + 1);
    } else {
      setFaceChecking(true);
      setTimeout(() => { setFaceChecking(false); setStep(4); setKycStatus("pending"); }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-10">
      {/* Progress */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="flex items-center gap-0 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-700 shrink-0 transition-all"
                  style={{
                    background: done ? "#A3E635" : active ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "#1e1e30",
                    color: done ? "#000" : "#fff",
                  }}
                >
                  {done ? "✓" : n}
                </div>
                <span className="text-xs font-display font-600 hidden sm:block" style={{ color: active ? "#c4b5fd" : done ? "#A3E635" : "#4b5563" }}>
                  {label}
                </span>
              </div>
              {i < 3 && <div className="w-8 h-0.5 mx-2 shrink-0" style={{ background: done ? "#7C3AED" : "#1e1e30" }} />}
            </div>
          );
        })}
      </div>

      {/* Security banner */}
      <div className="mb-6 flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}>
        <span>🛡️</span>
        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
          Định danh bắt buộc để đảm bảo an toàn giao dịch cho toàn bộ người dùng. Thông tin được mã hóa và bảo mật tuyệt đối theo tiêu chuẩn eKYC quốc gia.
        </p>
      </div>

      {/* STEP 1: Upload CCCD */}
      {step === 1 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-xl mb-1">Tải lên CCCD / CMND</h2>
          <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>
            Đảm bảo ảnh rõ nét, không mờ, không mất góc, không che khuất bất kỳ thông tin nào trên thẻ.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {(["front", "back"] as const).map(side => {
              const preview = side === "front" ? frontPreview : backPreview;
              const label = side === "front" ? "Mặt trước" : "Mặt sau";
              const icon = side === "front" ? "🪪" : "🔲";
              return (
                <div key={side}>
                  <p className="sp-filter-label mb-2">{label}</p>
                  <label className="block cursor-pointer">
                    <div
                      className="relative h-44 rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all"
                      style={{
                        border: preview ? "2px solid rgba(163,230,53,0.5)" : "2px dashed rgba(139,92,246,0.3)",
                        background: "#0a0a14",
                      }}
                    >
                      {preview ? (
                        <>
                          <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                            <div className="text-center">
                              <p className="text-2xl mb-1">✅</p>
                              <p className="text-xs font-600 text-white">Nhấn để đổi ảnh</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl mb-2">{icon}</span>
                          <p className="text-xs font-600 text-white mb-1">Nhấn để tải ảnh {label}</p>
                          <p className="text-xs" style={{ color: "#4b5563" }}>JPG, PNG — tối đa 10MB</p>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(side, e.target.files[0])} />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <p className="text-xs" style={{ color: "#FBBF24" }}>
              ⚠️ Ảnh phải rõ ràng, không mờ, không mất 4 góc, không chỉnh sửa hay che khuất thông tin. Ảnh vi phạm sẽ tự động bị từ chối.
            </p>
          </div>

          <button
            onClick={handleCCCDSubmit}
            disabled={!frontFile || !backFile || processing}
            className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm"
          >
            {processing ? "⏳ AI đang kiểm tra chất lượng ảnh..." : "🤖 Quét AI để trích xuất thông tin →"}
          </button>
        </div>
      )}

      {/* STEP 2: Quality check result */}
      {step === 2 && (
        <div className="sp-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(163,230,53,0.12)" }}>✅</div>
            <div>
              <h2 className="font-display font-800 text-white text-lg">Ảnh CCCD hợp lệ</h2>
              <p className="text-xs" style={{ color: "#9ca3af" }}>AI đã xác nhận ảnh rõ nét, đủ 4 góc</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Họ và tên", val: "LÊ ĐOÀN HUYỀN NHI" },
              { label: "Số CCCD", val: "079 205 xxx xxx" },
              { label: "Ngày sinh", val: "01/05/2001" },
              { label: "Địa chỉ", val: "TP. Hồ Chí Minh" },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: "#0a0a14" }}>
                <p className="sp-filter-label mb-1">{item.label}</p>
                <p className="text-sm font-600 text-white">{item.val}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl mb-5" style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.15)" }}>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              ℹ️ Bước tiếp theo: Xác thực khuôn mặt trực tiếp để đảm bảo bạn là chủ thẻ CCCD. Quá trình chỉ mất khoảng 30 giây.
            </p>
          </div>

          <button onClick={handleStep2Next} className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm">
            Tiếp tục xác thực khuôn mặt →
          </button>
        </div>
      )}

      {/* STEP 3: Liveness check */}
      {step === 3 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-xl mb-1">Nhận diện khuôn mặt</h2>
          <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>
            Hệ thống sẽ so sánh khuôn mặt thật của bạn với ảnh trên CCCD. Làm theo từng hướng dẫn.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Webcam simulation */}
            <div className="flex-1">
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{ aspectRatio: "1 / 1", background: "#030308", border: "2px solid rgba(139,92,246,0.5)", boxShadow: "0 0 30px rgba(139,92,246,0.2)" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div
                      className="w-44 h-44 rounded-full"
                      style={{ border: `3px dashed ${livenessIdx < LIVENESS_STEPS.length ? "#7C3AED" : "#A3E635"}`, boxShadow: "0 0 20px rgba(139,92,246,0.25)" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-5xl">
                      {faceChecking ? "🔄" : ["😐","😉","😊","↩️"][Math.min(livenessIdx, 3)]}
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-display font-700 text-red-400">LIVE</span>
                </div>
                {faceChecking && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="text-center">
                      <p className="text-3xl mb-2">🔄</p>
                      <p className="text-sm font-display font-700 text-white">Đang so sánh với CCCD...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="flex-1">
              <p className="sp-filter-label mb-3">Thực hiện từng bước</p>
              <div className="space-y-2 mb-4">
                {LIVENESS_STEPS.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: i === livenessIdx ? "rgba(139,92,246,0.12)" : i < livenessIdx ? "rgba(163,230,53,0.06)" : "#0a0a14",
                      border: i === livenessIdx ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-700 shrink-0"
                      style={{
                        background: i < livenessIdx ? "#A3E635" : i === livenessIdx ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "#1e1e30",
                        color: i < livenessIdx ? "#000" : "#fff",
                      }}
                    >
                      {i < livenessIdx ? "✓" : i + 1}
                    </div>
                    <span className="text-sm" style={{ color: i === livenessIdx ? "#fff" : i < livenessIdx ? "#A3E635" : "#6b7280" }}>
                      {s.icon} {s.text}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={handleLiveness} disabled={faceChecking} className="w-full sp-btn-primary py-3 font-display font-700">
                {faceChecking ? "Đang phân tích..." : livenessIdx < LIVENESS_STEPS.length - 1 ? "Tiếp tục →" : "Hoàn tất xác thực →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Pending */}
      {step === 4 && (
        <div className="sp-card p-10 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(251,191,36,0.1)", border: "2px solid rgba(251,191,36,0.3)" }}
          >
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="font-display font-800 text-white text-2xl mb-2">Chờ xét duyệt</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto leading-relaxed" style={{ color: "#9ca3af" }}>
            Hồ sơ đã được gửi thành công. Đội ngũ SafePass sẽ xem xét và phản hồi trong vòng{" "}
            <strong className="text-amber-400">24 giờ</strong>.
          </p>
          <div className="p-4 rounded-xl mb-6 text-left max-w-sm mx-auto" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <p className="text-xs font-700 text-amber-400 mb-1.5">⚠️ Trong thời gian chờ duyệt</p>
            <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
              Bạn chưa thể đăng bán vé hoặc thực hiện giao dịch. Khi được duyệt, bạn sẽ nhận thông báo qua email.
            </p>
          </div>
          <button onClick={() => nav("marketplace")} className="sp-btn-ghost px-6 py-2.5 font-display font-600">
            ← Về trang chủ
          </button>

          {/* Test bypass */}
          <div className="sp-testmode max-w-xs mx-auto">
            <p className="text-xs mb-2" style={{ color: "#4b5563", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600 }}>
              🧪 Chế độ test
            </p>
            <button
              className="sp-testmode-btn"
              onClick={() => { setKycStatus("approved"); nav("seller-dash"); }}
            >
              Giả sử đã xác minh → vào trang bán vé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
