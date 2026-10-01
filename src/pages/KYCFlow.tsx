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
  const { setKycStatus, nav, refreshProfile } = useApp();
  const [step, setStep] = useState<KycStep>(1);

  // Files & Previews
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  // --- TRẠNG THÁI PAN & ZOOM MẶT TRƯỚC ---
  const [frontZoom, setFrontZoom] = useState<number>(1.0);
  const [frontOffset, setFrontOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFrontDragging, setIsFrontDragging] = useState<boolean>(false);
  const [frontDragStart, setFrontDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const frontImgRef = useRef<HTMLImageElement | null>(null);

  // --- TRẠNG THÁI PAN & ZOOM MẶT SAU ---
  const [backZoom, setBackZoom] = useState<number>(1.0);
  const [backOffset, setBackOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBackDragging, setIsBackDragging] = useState<boolean>(false);
  const [backDragStart, setBackDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const backContainerRef = useRef<HTMLDivElement | null>(null);
  const backImgRef = useRef<HTMLImageElement | null>(null);

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

  const STEP_LABELS = ["Tải & Căn ảnh CCCD", "Xác nhận Thông tin", "Quét mặt WebCam", "Kích hoạt"];

  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    if (step === 3) startCamera();
    else stopCamera();
  }, [step]);

  // DRAG & PAN MẶT TRƯỚC
  const handleFrontMouseDown = (e: React.MouseEvent) => {
    if (!frontPreview) return;
    setIsFrontDragging(true);
    setFrontDragStart({ x: e.clientX - frontOffset.x, y: e.clientY - frontOffset.y });
  };
  const handleFrontMouseMove = (e: React.MouseEvent) => {
    if (!isFrontDragging) return;
    e.preventDefault();
    setFrontOffset({ x: e.clientX - frontDragStart.x, y: e.clientY - frontDragStart.y });
  };
  const handleFrontMouseUp = () => setIsFrontDragging(false);

  const handleFrontTouchStart = (e: React.TouchEvent) => {
    if (!frontPreview || e.touches.length !== 1) return;
    setIsFrontDragging(true);
    const touch = e.touches[0];
    setFrontDragStart({ x: touch.clientX - frontOffset.x, y: touch.clientY - frontOffset.y });
  };
  const handleFrontTouchMove = (e: React.TouchEvent) => {
    if (!isFrontDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setFrontOffset({ x: touch.clientX - frontDragStart.x, y: touch.clientY - frontDragStart.y });
  };
  const handleFrontTouchEnd = () => setIsFrontDragging(false);

  const resetFrontImage = () => {
    setFrontZoom(1.0);
    setFrontOffset({ x: 0, y: 0 });
  };

  // DRAG & PAN MẶT SAU
  const handleBackMouseDown = (e: React.MouseEvent) => {
    if (!backPreview) return;
    setIsBackDragging(true);
    setBackDragStart({ x: e.clientX - backOffset.x, y: e.clientY - backOffset.y });
  };
  const handleBackMouseMove = (e: React.MouseEvent) => {
    if (!isBackDragging) return;
    e.preventDefault();
    setBackOffset({ x: e.clientX - backDragStart.x, y: e.clientY - backDragStart.y });
  };
  const handleBackMouseUp = () => setIsBackDragging(false);

  const handleBackTouchStart = (e: React.TouchEvent) => {
    if (!backPreview || e.touches.length !== 1) return;
    setIsBackDragging(true);
    const touch = e.touches[0];
    setBackDragStart({ x: touch.clientX - backOffset.x, y: touch.clientY - backOffset.y });
  };
  const handleBackTouchMove = (e: React.TouchEvent) => {
    if (!isBackDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setBackOffset({ x: touch.clientX - backDragStart.x, y: touch.clientY - backDragStart.y });
  };
  const handleBackTouchEnd = () => setIsBackDragging(false);

  const resetBackImage = () => {
    setBackZoom(1.0);
    setBackOffset({ x: 0, y: 0 });
  };

  const handleFileUpload = (side: "front" | "back", file: File) => {
    setStep1Error(null);
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setFrontFile(file);
      setFrontPreview(url);
      resetFrontImage();
    } else {
      setBackFile(file);
      setBackPreview(url);
      resetBackImage();
    }
  };

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

  const getCroppedDataUrl = (
    previewUrl: string | null,
    container: HTMLDivElement | null,
    img: HTMLImageElement | null,
    offset: { x: number; y: number },
    zoom: number
  ): Promise<string> => {
    return new Promise((resolve) => {
      if (!previewUrl || !container || !img) {
        resolve(previewUrl || "");
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const boxWidth = containerRect.width;
      const boxHeight = containerRect.height;

      const scaleFactor = 2;
      const canvas = document.createElement("canvas");
      canvas.width = boxWidth * scaleFactor;
      canvas.height = boxHeight * scaleFactor;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(previewUrl);
        return;
      }

      ctx.scale(scaleFactor, scaleFactor);

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const boxRatio = boxWidth / boxHeight;

      let renderW = boxWidth;
      let renderH = boxHeight;

      if (imgRatio > boxRatio) {
        renderH = boxWidth / imgRatio;
      } else {
        renderW = boxHeight * imgRatio;
      }

      const centerX = boxWidth / 2 + offset.x;
      const centerY = boxHeight / 2 + offset.y;

      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, boxWidth, boxHeight);

      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    });
  };

  const isHeaderJunk = (strUpper: string): boolean => {
    const noAccent = strUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D");
    const headerTokens = [
      "CONG", "HOA", "XA", "HOI", "CHU", "NGHIA", "VIET", "NAM",
      "DOC", "LAP", "TU", "DO", "HANH", "PHUC",
      "CAN", "CUOC", "CUC", "CNG", "DAN", "CITIZEN", "IDENTITY", "CARD",
      "SO", "NO", "SEX", "DATE", "BIRTH", "QUOC", "TICH", "QUE", "QUAN", "NOI", "THUONG", "TRU"
    ];

    const words = noAccent.split(/\s+/);
    let matchCount = 0;
    for (const w of words) {
      if (headerTokens.some(tok => w === tok || w.startsWith(tok) || w.endsWith(tok))) {
        matchCount++;
      }
    }
    return matchCount >= 1;
  };

  // 1. QUÉT OCR THỰC TẾ 100% TỪ ẢNH CCCD (KHÔNG FALLBACK TÊN TÀI KHOẢN)
  const handleValidateAndScanCccd = async () => {
    if (!frontFile || !frontPreview) return;
    setProcessing(true);
    setStep1Error(null);

    try {
      const processedFrontSrc = await getCroppedDataUrl(
        frontPreview,
        frontContainerRef.current,
        frontImgRef.current,
        frontOffset,
        frontZoom
      );

      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      const cccdImg = await faceapi.fetchImage(processedFrontSrc);
      const detection = await faceapi.detectSingleFace(cccdImg).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setStep1Error("Không tìm thấy khuôn mặt rõ ràng trên CCCD! Dùng chuột kéo di chuyển & chỉnh thanh Zoom để đưa ảnh mặt vào giữa khung rồi thử lại.");
        setProcessing(false);
        return;
      }

      // Quét OCR bằng Tesseract.js
      const { data: { text } } = await Tesseract.recognize(processedFrontSrc, "vie");
      
      const idMatch = text.match(/\b\d{12}\b/);
      const detectedId = idMatch ? idMatch[0] : "";

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let detectedName = "";

      for (let i = 0; i < lines.length; i++) {
        const lineUpper = lines[i].toUpperCase();
        if (lineUpper.includes("HỌ VÀ TÊN") || lineUpper.includes("HỌ TÊN") || lineUpper.includes("FULL NAME")) {
          if (lines[i].includes(":")) {
            const afterColon = lines[i].split(":")[1].replace(/[^a-zA-ZàáâãèéêìíòóôõùúưđýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚƯĐÝ\s]/g, "").trim().toUpperCase();
            if (afterColon.length >= 4 && !/\d/.test(afterColon) && !isHeaderJunk(afterColon)) {
              detectedName = afterColon;
              break;
            }
          }
          for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
            const cleanNext = lines[j].replace(/[^a-zA-ZàáâãèéêìíòóôõùúưđýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚƯĐÝ\s]/g, "").trim().toUpperCase();
            if (cleanNext.length >= 4 && !/\d/.test(lines[j]) && !isHeaderJunk(cleanNext)) {
              detectedName = cleanNext;
              break;
            }
          }
          if (detectedName) break;
        }
      }

      if (!detectedName) {
        for (const line of lines) {
          if (/\d/.test(line)) continue;
          const cleanLine = line.replace(/[^a-zA-ZàáâãèéêìíòóôõùúưđýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚƯĐÝ\s]/g, "").trim();
          const upperLine = cleanLine.toUpperCase();

          if (cleanLine.length < 5 || cleanLine !== upperLine) continue;
          if (isHeaderJunk(upperLine)) continue;

          const words = upperLine.split(/\s+/);
          if (words.length >= 2 && words.length <= 5) {
            detectedName = upperLine;
            break;
          }
        }
      }

      // ❌ TUYỆT ĐỐI KHÔNG FALLBACK. NẾU KHÔNG ĐỌC ĐƯỢC TÊN -> BÁO LỖI DỪNG LẠI.
      if (!detectedName) {
        setStep1Error("Không thể đọc được Họ và tên từ ảnh CCCD. Vui lòng căn chỉnh lại vị trí ảnh phóng to vùng tên và thử lại.");
        setProcessing(false);
        return;
      }

      if (!detectedId) {
        setStep1Error("Không tìm thấy số CCCD (12 chữ số). Vui lòng căn chỉnh lại khung ảnh mặt trước.");
        setProcessing(false);
        return;
      }

      setCccdDescriptor(detection.descriptor);
      setOcrData({
        fullName: detectedName,
        idNumber: detectedId,
      });

      setProcessing(false);
      setStep(2);
    } catch (err) {
      console.error(err);
      setStep1Error("Lỗi xử lý ảnh CCCD. Vui lòng thử lại.");
      setProcessing(false);
    }
  };

  // 2. CHỤP WEBCAM & SO KHỚP
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

      const distance = faceapi.euclideanDistance(cccdDescriptor, detection.descriptor);

      if (distance < 0.45) {
        setMatchingStatus("matched");
        stopCamera();
      } else {
        setMatchingStatus("failed");
      }
    } catch (err) {
      setMatchingStatus("failed");
    }
  };

  // 3. HOÀN TẤT & LƯU SUPABASE (UUID chuẩn)
  const handleCompleteKYC = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        alert("Không tìm thấy phiên đăng nhập hợp lệ. Vui lòng đăng nhập lại!");
        return;
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          kyc_status: "verified",
          is_verified: true,
          full_name: ocrData.fullName,
          cccd_number: ocrData.idNumber,
        })
        .eq("id", user.id);

      if (dbError) throw dbError;
      
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

      {/* BƯỚC 1: TẢI & CĂN CHỈNH 2 MẶT CCCD */}
      {step === 1 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-xl mb-1">Bước 1: Tải lên & Căn chỉnh CCCD</h2>
          <p className="text-sm mb-5 text-gray-400">
            Kéo rê di chuyển vị trí và dùng thanh trượt để phóng to/thu nhỏ ảnh của cả 2 mặt CCCD.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* MẶT TRƯỚC */}
            <div>
              <p className="sp-filter-label mb-2 flex justify-between items-center">
                <span>Mặt trước (chân dung)</span>
                {frontPreview && (
                  <button onClick={resetFrontImage} className="text-[11px] text-purple-400 hover:underline cursor-pointer">
                    🔄 Đặt lại
                  </button>
                )}
              </p>

              <div
                ref={frontContainerRef}
                onMouseDown={handleFrontMouseDown}
                onMouseMove={handleFrontMouseMove}
                onMouseUp={handleFrontMouseUp}
                onMouseLeave={handleFrontMouseUp}
                onTouchStart={handleFrontTouchStart}
                onTouchMove={handleFrontTouchMove}
                onTouchEnd={handleFrontTouchEnd}
                className={`relative h-52 rounded-xl overflow-hidden bg-[#0a0a16] border flex items-center justify-center select-none ${
                  isFrontDragging ? "cursor-grabbing" : frontPreview ? "cursor-grab" : "cursor-pointer"
                }`}
                style={{
                  border: frontPreview ? "2px solid rgba(163,230,53,0.6)" : "2px dashed rgba(139,92,246,0.3)",
                }}
              >
                {frontPreview ? (
                  <>
                    <img
                      ref={frontImgRef}
                      src={frontPreview}
                      alt="CCCD Mặt trước"
                      draggable={false}
                      style={{
                        transform: `translate(${frontOffset.x}px, ${frontOffset.y}px) scale(${frontZoom})`,
                        transition: isFrontDragging ? "none" : "transform 0.1s ease",
                      }}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] bg-black/60 text-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        🖐️ Kéo rê để di chuyển ảnh
                      </span>
                    </div>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <p className="text-xs font-700 text-white">Nhấn chọn ảnh Mặt trước</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload("front", e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {frontPreview && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-purple-300 font-bold">
                    <span>🔍 Phóng to / Thu nhỏ:</span>
                    <span>{Math.round(frontZoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={frontZoom}
                    onChange={(e) => setFrontZoom(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <label className="text-[11px] text-gray-400 hover:text-white cursor-pointer underline">
                      Đổi ảnh mặt trước
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFileUpload("front", e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* MẶT SAU */}
            <div>
              <p className="sp-filter-label mb-2 flex justify-between items-center">
                <span>Mặt sau (mã QR & chip)</span>
                {backPreview && (
                  <button onClick={resetBackImage} className="text-[11px] text-purple-400 hover:underline cursor-pointer">
                    🔄 Đặt lại
                  </button>
                )}
              </p>

              <div
                ref={backContainerRef}
                onMouseDown={handleBackMouseDown}
                onMouseMove={handleBackMouseMove}
                onMouseUp={handleBackMouseUp}
                onMouseLeave={handleBackMouseUp}
                onTouchStart={handleBackTouchStart}
                onTouchMove={handleBackTouchMove}
                onTouchEnd={handleBackTouchEnd}
                className={`relative h-52 rounded-xl overflow-hidden bg-[#0a0a16] border flex items-center justify-center select-none ${
                  isBackDragging ? "cursor-grabbing" : backPreview ? "cursor-grab" : "cursor-pointer"
                }`}
                style={{
                  border: backPreview ? "2px solid rgba(163,230,53,0.6)" : "2px dashed rgba(139,92,246,0.3)",
                }}
              >
                {backPreview ? (
                  <>
                    <img
                      ref={backImgRef}
                      src={backPreview}
                      alt="CCCD Mặt sau"
                      draggable={false}
                      style={{
                        transform: `translate(${backOffset.x}px, ${backOffset.y}px) scale(${backZoom})`,
                        transition: isBackDragging ? "none" : "transform 0.1s ease",
                      }}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] bg-black/60 text-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        🖐️ Kéo rê để di chuyển ảnh
                      </span>
                    </div>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <p className="text-xs font-700 text-white">Nhấn chọn ảnh Mặt sau</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload("back", e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {backPreview && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-purple-300 font-bold">
                    <span>🔍 Phóng to / Thu nhỏ:</span>
                    <span>{Math.round(backZoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={backZoom}
                    onChange={(e) => setBackZoom(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <label className="text-[11px] text-gray-400 hover:text-white cursor-pointer underline">
                      Đổi ảnh mặt sau
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFileUpload("back", e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {step1Error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-5 flex items-center gap-2">
              <span>⚠️</span>
              <span>{step1Error}</span>
            </div>
          )}

          <button
            onClick={handleValidateAndScanCccd}
            disabled={!frontFile || processing}
            className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm disabled:opacity-40 cursor-pointer"
          >
            {processing ? "⏳ AI đang trích xuất vùng ảnh đã chọn..." : "🤖 Kiểm Tra Ảnh & Trích Xuất Thông Tin →"}
          </button>
        </div>
      )}

      {/* BƯỚC 2: XÁC NHẬN KẾT QUẢ OCR (KHÓA CHỈNH SỬA) */}
      {step === 2 && (
        <div className="sp-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-800 text-white text-lg">✓ Khung ảnh hợp lệ! Thông tin trích xuất AI</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-gray-400 border border-slate-700 font-medium flex items-center gap-1">
              🔒 Khóa chỉnh sửa
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Thông tin đã được cố định tự động từ thẻ CCCD. Nếu thông tin chưa khớp, vui lòng bấm nút "Căn chỉnh lại vị trí ảnh" để quét lại.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            <div className="p-3.5 rounded-xl bg-[#0a0a16] border border-white/5">
              <label className="sp-filter-label mb-1 block text-gray-400">Họ và tên (Cố định)</label>
              <input
                type="text"
                value={ocrData.fullName}
                readOnly
                className="sp-input text-sm font-bold text-white uppercase bg-white/5 cursor-not-allowed border-white/10"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-[#0a0a16] border border-white/5">
              <label className="sp-filter-label mb-1 block text-gray-400">Số thẻ CCCD (Cố định)</label>
              <input
                type="text"
                value={ocrData.idNumber}
                readOnly
                className="sp-input text-sm font-mono text-white bg-white/5 cursor-not-allowed border-white/10"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="sp-btn-ghost py-3 px-5 text-xs font-display font-700">
              ← Căn chỉnh lại vị trí ảnh
            </button>
            <button onClick={() => setStep(3)} className="flex-1 sp-btn-primary py-3.5 font-display font-700 text-sm">
              Xác nhận & Mở WebCam đối chiếu →
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
              ✓ Khuôn mặt trùng khớp chính chủ!
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
                className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm cursor-pointer"
              >
                📸 Chụp & Đối Chiếu Với CCCD
              </button>
            ) : (
              <button
                onClick={handleCompleteKYC}
                className="w-full py-3.5 rounded-xl font-display font-800 text-black text-sm bg-gradient-to-r from-lime-400 to-emerald-400 cursor-pointer"
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
          <button onClick={() => nav("seller-dash")} className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm cursor-pointer">
            Vào Trang Quản Lý Bán Vé →
          </button>
        </div>
      )}
    </div>
  );
}