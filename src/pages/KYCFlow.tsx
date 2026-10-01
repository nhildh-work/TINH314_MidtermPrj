import React, { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import * as faceapi from "@vladmandic/face-api";
import { useApp } from "../context";
import { supabase } from "../lib/supabaseClient";

type KycStep = 1 | 2 | 3 | 4;

interface CccdExtractedData {
  fullName: string;
  idNumber: string;
}

export default function KYCFlow() {
  const { setKycStatus, nav, currentUser, refreshProfile } = useApp();
  const [step, setStep] = useState<KycStep>(1);

  // Files & Previews
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  
  // Trạng thái xử lý & Lỗi
  const [processing, setProcessing] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // AI OCR Data & Model
  const [ocrData, setOcrData] = useState<CccdExtractedData>({ fullName: "", idNumber: "" });
  const [cccdDescriptor, setCccdDescriptor] = useState<Float32Array | null>(null);

  // WebCam & Matching State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<"idle" | "scanning" | "matched" | "failed">("idle");
  const [matchScore, setMatchScore] = useState<number>(0);

  const STEP_LABELS = ["Tải & Kiểm tra CCCD", "Xác nhận Thông tin", "Quét mặt WebCam", "Kích hoạt"];

  // Dọn dẹp camera
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  // Bật/Tắt Camera ở Step 3
  useEffect(() => {
    if (step === 3) startCamera();
    else stopCamera();
  }, [step]);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    setMatchingStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setCameraError("Không thể mở WebCam. Vui lòng cấp quyền truy cập camera trên trình duyệt.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleFileUpload = (side: "front" | "back", file: File) => {
    setStep1Error(null);
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setFrontFile(file);
      setFrontPreview(url);
    } else {
      setBackFile(file);
      setBackPreview(url);
    }
  };

  // 1. KIỂM TRA NGAY BƯỚC 1: XÁC MINH ẢNH CCCD CÓ ĐỦ ĐIỀU KIỆN KHÔNG?
  const handleValidateAndScanCccd = async () => {
    if (!frontFile || !frontPreview) return;
    setProcessing(true);
    setStep1Error(null);

    try {
      // A. Tải AI Model kiểm tra khuôn mặt trên CCCD trước
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      const cccdImg = await faceapi.fetchImage(frontPreview);
      const detection = await faceapi.detectSingleFace(cccdImg).withFaceLandmarks().withFaceDescriptor();

      // ❌ CHẶN BƯỚC 1: Nếu không tìm thấy khuôn mặt trên ảnh CCCD
      if (!detection) {
        setStep1Error("Không tìm thấy khuôn mặt rõ ràng trên thẻ CCCD! Vui lòng chọn lại ảnh chụp thẳng, đủ ánh sáng và không bị mờ.");
        setProcessing(false);
        return;
      }

      // B. Đọc OCR chữ từ CCCD bằng Tesseract
      const { data: { text } } = await Tesseract.recognize(frontFile, "vie");
      const idMatch = text.match(/\b\d{12}\b/);
      const detectedId = idMatch ? idMatch[0] : "";

      // Lấy tên viết hoa
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let detectedName = "";
      for (const line of lines) {
        if (line === line.toUpperCase() && line.length > 5 && !line.includes("CỘNG HÒA") && !line.includes("CĂN CƯỚC")) {
          detectedName = line;
          break;
        }
      }

      // ❌ CHẶN BƯỚC 1: Nếu không đọc được cả số CCCD lẫn tên
      if (!detectedId && !detectedName) {
        setStep1Error("Ảnh CCCD quá mờ không thể đọc được thông tin. Vui lòng chụp lại ảnh rõ nét hơn.");
        setProcessing(false);
        return;
      }

      // ✅ ĐỦ ĐIỀU KIỆN: Lưu Vector khuôn mặt CCCD và cho chuyển sang Bước 2
      setCccdDescriptor(detection.descriptor);
      setOcrData({
        fullName: detectedName || "NGUYỄN VĂN A",
        idNumber: detectedId || "Chưa nhận diện rõ",
      });

      setProcessing(false);
      setStep(2); // Chuyển sang bước 2 xác nhận
    } catch (err) {
      console.error(err);
      setStep1Error("Lỗi trong quá trình phân tích ảnh. Vui lòng thử lại với ảnh khác.");
      setProcessing(false);
    }
  };

  // 2. CHỤP WEBCAM & SO KHỚP VỚI VECTOR CCCD ĐÃ LƯU
  const handleCaptureAndMatch = async () => {
    if (!videoRef.current || !canvasRef.current || !cccdDescriptor) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg");
    setCapturedPhoto(photoDataUrl);
    setMatchingStatus("scanning");

    try {
      const liveImg = await faceapi.fetchImage(photoDataUrl);
      const detection = await faceapi.detectSingleFace(liveImg).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setMatchingStatus("failed");
        return;
      }

      // So sánh Euclidean Distance giữa mặt WebCam và mặt trên CCCD đã được duyệt ở B1
      const distance = faceapi.euclideanDistance(cccdDescriptor, detection.descriptor);
      const similarity = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
      setMatchScore(similarity);

      if (distance < 0.45) { // Khớp > 80%
        setMatchingStatus("matched");
        stopCamera();
      } else {
        setMatchingStatus("failed");
      }
    } catch (err) {
      setMatchingStatus("failed");
    }
  };

  // 3. HOÀN TẤT & LƯU SUPABASE
  const handleCompleteKYC = async () => {
    if (!currentUser?.id) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          kyc_status: "verified",
          is_verified: true,
          full_name: ocrData.fullName,
          cccd_number: ocrData.idNumber,
        })
        .eq("id", currentUser.id);

      if (error) throw error;
      setKycStatus("approved");
      await refreshProfile();
      setStep(4);
    } catch (err: any) {
      alert("Lỗi lưu CSDL: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-10">
      {/* Thanh tiến trình */}
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
                <span
                  className="text-xs font-display font-600 hidden sm:block"
                  style={{ color: active ? "#c4b5fd" : done ? "#A3E635" : "#4b5563" }}
                >
                  {label}
                </span>
              </div>
              {i < 3 && <div className="w-8 h-0.5 mx-2 shrink-0" style={{ background: done ? "#7C3AED" : "#1e1e30" }} />}
            </div>
          );
        })}
      </div>

      {/* BƯỚC 1: TẢI ẢNH & KIỂM TRA ĐẦU VÀO */}
      {step === 1 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-xl mb-1">Bước 1: Tải lên & Kiểm tra CCCD</h2>
          <p className="text-sm mb-5 text-gray-400">
            Tải ảnh mặt trước rõ nét để AI bóc tách thông tin và xác nhận khuôn mặt trên thẻ.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {(["front", "back"] as const).map(side => {
              const preview = side === "front" ? frontPreview : backPreview;
              const label = side === "front" ? "Mặt trước (có ảnh chân dung)" : "Mặt sau (có chip)";
              return (
                <div key={side}>
                  <p className="sp-filter-label mb-2">{label}</p>
                  <label className="block cursor-pointer">
                    <div
                      className="relative h-48 rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all bg-[#0a0a16]"
                      style={{
                        border: preview ? "2px solid rgba(163,230,53,0.6)" : "2px dashed rgba(139,92,246,0.3)",
                      }}
                    >
                      {preview ? (
                        <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <p className="text-xs font-700 text-white">Nhấn chọn ảnh {side === "front" ? "Mặt trước" : "Mặt sau"}</p>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload(side, e.target.files[0])}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          {/* HIỂN THỊ THÔNG BÁO LỖI NẾU KHÔNG ĐẠT CẢM BIẾN AI */}
          {step1Error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-5 flex items-center gap-2">
              <span>⚠️</span>
              <span>{step1Error}</span>
            </div>
          )}

          <button
            onClick={handleValidateAndScanCccd}
            disabled={!frontFile || processing}
            className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm disabled:opacity-40"
          >
            {processing ? "⏳ AI đang quét khuôn mặt & đọc thông tin CCCD..." : "🤖 Kiểm Tra Ảnh & Trích Xuất Thông Tin →"}
          </button>
        </div>
      )}

      {/* BƯỚC 2: XÁC NHẬN KẾT QUẢ OCR (CHỈ VÀO ĐƯỢC KHI BƯỚC 1 ĐÃ THÀNH CÔNG) */}
      {step === 2 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-lg mb-2">✓ CCCD hợp lệ! Kiểm tra lại thông tin</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            <div className="p-3.5 rounded-xl bg-[#0a0a16] border border-white/5">
              <label className="sp-filter-label mb-1 block">Họ và tên</label>
              <input
                type="text"
                value={ocrData.fullName}
                onChange={e => setOcrData({ ...ocrData, fullName: e.target.value })}
                className="sp-input text-sm font-bold text-white uppercase"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-[#0a0a16] border border-white/5">
              <label className="sp-filter-label mb-1 block">Số thẻ CCCD</label>
              <input
                type="text"
                value={ocrData.idNumber}
                onChange={e => setOcrData({ ...ocrData, idNumber: e.target.value })}
                className="sp-input text-sm font-mono text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="sp-btn-ghost py-3 px-5 text-xs font-display font-700">
              ← Chọn lại ảnh
            </button>
            <button onClick={() => setStep(3)} className="flex-1 sp-btn-primary py-3.5 font-display font-700 text-sm">
              Xác nhận thông tin & Mở WebCam quét mặt →
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 3: WEBCAM FACE MATCHING */}
      {step === 3 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-xl mb-4">Bước 3: Đối chiếu khuôn mặt trực tiếp</h2>

          <div className="relative max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-black border-2 border-purple-500/40 shadow-2xl mb-5">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${capturedPhoto ? "hidden" : "block"}`}
            />
            {capturedPhoto && <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover scale-x-[-1]" />}
            <canvas ref={canvasRef} className="hidden" />

            {matchingStatus === "scanning" && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-sm">
                Đang đối chiếu với ảnh CCCD...
              </div>
            )}
          </div>

          {matchingStatus === "matched" && (
            <div className="p-4 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs mb-5 font-bold text-center">
              ✓ Khuôn mặt trùng khớp chính chủ ({matchScore}% MATCH)!
            </div>
          )}

          {matchingStatus === "failed" && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-5 text-center">
              Khuôn mặt không trùng khớp với CCCD. Vui lòng di chuyển vào giữa khung hình và thử lại!
            </div>
          )}

          <div className="flex gap-3">
            {matchingStatus !== "matched" ? (
              <button
                onClick={handleCaptureAndMatch}
                disabled={!!cameraError || matchingStatus === "scanning"}
                className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm"
              >
                📸 Chụp & Đối Chiếu Với CCCD
              </button>
            ) : (
              <button
                onClick={handleCompleteKYC}
                className="w-full py-3.5 rounded-xl font-display font-800 text-black text-sm bg-gradient-to-r from-lime-400 to-emerald-400"
              >
                ✓ Hoàn Tất & Cập Nhật Supabase →
              </button>
            )}
          </div>
        </div>
      )}

      {/* BƯỚC 4: HOÀN THÀNH */}
      {step === 4 && (
        <div className="sp-card p-10 text-center max-w-lg mx-auto">
          <h2 className="font-display font-800 text-white text-2xl mb-2">🎉 Xác thực thành công!</h2>
          <p className="text-sm text-gray-300 mb-6">Tài khoản của bạn đã được xác minh chính chủ.</p>
          <button onClick={() => nav("seller-dash")} className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm">
            Vào Trang Quản Lý Bán Vé →
          </button>
        </div>
      )}
    </div>
  );
}