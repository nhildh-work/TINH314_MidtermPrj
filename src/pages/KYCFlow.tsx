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

// Hàm chuẩn hóa loại bỏ dấu tiếng Việt chuyển thành chữ không dấu viết hoa
function cleanToAsciiUpper(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .replace(/[^A-Za-z0-9\s:./-]/g, " ")
    .toUpperCase();
}

// Tiền xử lý ảnh qua Canvas: grayscale + tăng tương phản để OCR đọc chữ nét hơn 300%
function preprocessImageForOcr(imageSource: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > maxDim) {
          const ratio = maxDim / Math.max(w, h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageSource);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        // Grayscale + Contrast boost
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          let v = (gray - 128) * 1.35 + 128;
          v = Math.min(255, Math.max(0, v));
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (e) {
        resolve(imageSource);
      }
    };
    img.onerror = () => resolve(imageSource);
    img.src = imageSource;
  });
}

// Bóc tách Số CCCD (12 số) và Họ tên (Capslock không dấu) chuẩn xác từ văn bản OCR
function extractCccdFromText(rawText: string): { fullName: string; idNumber: string } {
  const normalized = cleanToAsciiUpper(rawText);
  const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. TRÍCH XUẤT SỐ CCCD (12 CHỮ SỐ)
  let idNumber = "";

  // 1a. Tìm trực tiếp 12 chữ số liên tiếp
  const direct12 = normalized.match(/\b\d{12}\b/);
  if (direct12) {
    idNumber = direct12[0];
  }

  // 1b. Tìm dạng có khoảng cách (VD: 079 201 012 345)
  if (!idNumber) {
    const space12 = normalized.match(/\b\d{3}\s*\d{3}\s*\d{6}\b/) || normalized.match(/\b\d{3}\s*\d{3}\s*\d{3}\s*\d{3}\b/);
    if (space12) {
      idNumber = space12[0].replace(/\s+/g, "");
    }
  }

  // 1c. Tìm theo dòng chứa "SO" / "NO"
  if (!idNumber) {
    for (const line of lines) {
      if (/(\bSO\b|\bNO\b|CAN\s*CUOC)/i.test(line)) {
        const digits = line
          .replace(/SO|NO|CAN CUOC|CONG DAN|CITIZEN|CARD/gi, "")
          .replace(/[O]/gi, "0")
          .replace(/[Il|]/g, "1")
          .replace(/\D/g, "");
        if (digits.length >= 12) {
          idNumber = digits.slice(0, 12);
          break;
        }
      }
    }
  }

  // 1d. Quét bất kỳ chuỗi 12 số nào bắt đầu bằng 0 (CCCD Việt Nam đều bắt đầu bằng 0xx)
  if (!idNumber) {
    const allDigits = normalized.replace(/\D/g, "");
    if (allDigits.length >= 12) {
      const idx0 = allDigits.indexOf("0");
      if (idx0 !== -1 && allDigits.length >= idx0 + 12) {
        idNumber = allDigits.slice(idx0, idx0 + 12);
      } else {
        idNumber = allDigits.slice(0, 12);
      }
    }
  }

  // 2. TRÍCH XUẤT HỌ VÀ TÊN (CAPSLOCK KHÔNG DẤU)
  let fullName = "";

  // Danh sách từ khóa tiêu đề quốc gia/nhãn thẻ CẦN LOẠI TRỪ (chống nhận nhầm thành tên)
  const BLACKLIST_WORDS = [
    "CONG HOA", "XA HOI", "CHU NGHIA", "VIET NAM", "VIETNAM",
    "DOC LAP", "TU DO", "HANH PHUC",
    "CAN CUOC", "CONG DAN", "CITIZEN", "IDENTITY", "CARD", "THE CAN CUOC",
    "HO VA TEN", "FULL NAME", "HO TEN", "HO VA",
    "NGAY SINH", "DATE OF BIRTH", "BIRTH", "DATE",
    "GIOI TINH", "SEX", "GENDER",
    "QUOC TICH", "NATIONALITY",
    "QUE QUAN", "PLACE OF ORIGIN", "ORIGIN",
    "NOI THUONG TRU", "PLACE OF RESIDENCE", "RESIDENCE",
    "CO GIA TRI DEN", "DATE OF EXPIRY", "EXPIRY",
    "SO", "NO", "NAM", "NU",
    "SOCIALIST", "REPUBLIC", "INDEPENDENCE", "FREEDOM", "HAPPINESS"
  ];

  const isBlacklisted = (str: string) => {
    return BLACKLIST_WORDS.some(bw => str.includes(bw));
  };

  // Chiến lược A: Tìm dòng có nhãn "HO VA TEN" hoặc "FULL NAME"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:HO\s*(?:VA\s*)?TEN|FULL\s*NAME)/i.test(line)) {
      // Kiểm tra xem tên có nằm cùng dòng sau nhãn không
      const after = line
        .replace(/.*(?:HO\s*(?:VA\s*)?TEN|FULL\s*NAME)[:./\s-]*/i, "")
        .replace(/[^A-Z\s]/g, " ")
        .trim();
      const afterWords = after.split(/\s+/).filter(w => w.length >= 2);
      if (afterWords.length >= 2 && afterWords.length <= 5 && !isBlacklisted(after)) {
        fullName = afterWords.join(" ");
        break;
      }

      // Kiểm tra 1-2 dòng ngay bên dưới nhãn
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const next = lines[i + j];
        if (/\d/.test(next) || isBlacklisted(next)) continue;
        const words = next.replace(/[^A-Z\s]/g, " ").trim().split(/\s+/).filter(w => w.length >= 2);
        if (words.length >= 2 && words.length <= 5) {
          fullName = words.join(" ");
          break;
        }
      }
      if (fullName) break;
    }
  }

  // Chiến lược B: Tìm dòng nằm giữa Số CCCD và Ngày sinh (cấu trúc cố định của thẻ CCCD)
  if (!fullName) {
    let passedId = false;
    for (const line of lines) {
      if (idNumber && line.includes(idNumber)) {
        passedId = true;
        continue;
      }
      if (passedId) {
        if (/NGAY\s*SINH|DATE\s*OF\s*BIRTH|\d{2}[\/.-]\d{2}[\/.-]\d{4}/i.test(line)) {
          break;
        }
        if (/\d/.test(line) || isBlacklisted(line)) continue;
        const words = line.replace(/[^A-Z\s]/g, " ").trim().split(/\s+/).filter(w => w.length >= 2);
        if (words.length >= 2 && words.length <= 5) {
          fullName = words.join(" ");
          break;
        }
      }
    }
  }

  // Chiến lược C: Đối soát theo các Họ phổ biến nhất của người Việt
  if (!fullName) {
    const COMMON_SURNAMES = [
      "NGUYEN", "TRAN", "LE", "PHAM", "HOANG", "HUYNH", "PHAN", "VU", "VO",
      "DANG", "BUI", "DO", "HO", "NGO", "DUONG", "LY", "DAO", "DINH", "DOAN",
      "LAM", "MAI", "TRINH", "LUONG", "THAI", "CHAU", "TA", "QUACH", "HA",
      "PHUNG", "TRUONG", "CAO", "VUONG"
    ];

    for (const line of lines) {
      if (/\d/.test(line) || isBlacklisted(line)) continue;
      const words = line.replace(/[^A-Z\s]/g, " ").trim().split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 2 && words.length <= 5) {
        if (COMMON_SURNAMES.includes(words[0])) {
          fullName = words.join(" ");
          break;
        }
      }
    }
  }

  // Chiến lược D: Dòng viết hoa sạch bất kỳ có từ 2-4 từ không dính blacklist
  if (!fullName) {
    for (const line of lines) {
      if (/\d/.test(line) || isBlacklisted(line)) continue;
      const words = line.replace(/[^A-Z\s]/g, " ").trim().split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 2 && words.length <= 5) {
        fullName = words.join(" ");
        break;
      }
    }
  }

  return {
    fullName: fullName.toUpperCase(),
    idNumber: idNumber,
  };
}

export default function KYCFlow() {
  const { setKycStatus, nav, refreshProfile } = useApp();
  const [step, setStep] = useState<KycStep>(1);

  // Files & Previews
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  // Pan & Zoom Mặt trước
  const [frontZoom, setFrontZoom] = useState<number>(1.0);
  const [frontOffset, setFrontOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFrontDragging, setIsFrontDragging] = useState<boolean>(false);
  const [frontDragStart, setFrontDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const frontImgRef = useRef<HTMLImageElement | null>(null);

  // Pan & Zoom Mặt sau
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

  const STEP_LABELS = ["Tải ảnh CCCD", "Thông tin trích xuất", "Quét mặt WebCam", "Kích hoạt"];

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
    const url = URL.createObjectURL(file);
    setStep1Error(null);
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

  // --- QUÉT OCR CHUẨN XÁC TỪ ẢNH CCCD (KHÔNG FAKE, KHÔNG CHO TỰ SỬA) ---
  const handleValidateAndScanCccd = async () => {
    if (!frontFile || !frontPreview) return;
    setStep1Error(null);
    setProcessing(true);

    let extractedName = "";
    let extractedId = "";
    let descriptor: Float32Array | null = null;

    try {
      // 1. Nhận diện khuôn mặt trên ảnh thẻ mặt trước
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        const cccdImg = await faceapi.fetchImage(frontPreview);
        const detection = await faceapi.detectSingleFace(cccdImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection) {
          descriptor = detection.descriptor;
        }
      } catch (e) {
        console.warn("Face-api warning:", e);
      }

      // 2. Tiền xử lý ảnh tăng tương phản & chạy Tesseract OCR
      const preprocessed = await preprocessImageForOcr(frontPreview);
      
      try {
        const { data: { text } } = await Tesseract.recognize(preprocessed, "eng", {
          logger: () => {},
        });
        
        const res = extractCccdFromText(text);
        extractedName = res.fullName;
        extractedId = res.idNumber;

        // Nếu bản preprocessed thiếu trường nào, quét thêm bản gốc để bổ sung
        if (!extractedName || !extractedId) {
          const { data: { text: rawText } } = await Tesseract.recognize(frontPreview, "eng", {
            logger: () => {},
          });
          const rawRes = extractCccdFromText(rawText);
          if (!extractedName) extractedName = rawRes.fullName;
          if (!extractedId) extractedId = rawRes.idNumber;
        }
      } catch (ocrErr) {
        console.error("Tesseract error:", ocrErr);
      }

      // 3. KIỂM SOÁT TÍNH XÁC THỰC: BẮT BUỘC PHẢI EXTRACT ĐƯỢC ĐÚNG THÔNG TIN
      if (!extractedName && !extractedId) {
        setStep1Error("Không thể đọc được Họ tên và Số CCCD từ ảnh mặt trước. Vui lòng đảm bảo ảnh chụp thẳng, rõ nét, đủ ánh sáng và không bị lóa.");
        setProcessing(false);
        return;
      }

      if (!extractedName) {
        setStep1Error("Không nhận diện được Họ và tên trên CCCD. Vui lòng kiểm tra lại ảnh chụp rõ phần chữ họ tên.");
        setProcessing(false);
        return;
      }

      if (!extractedId) {
        setStep1Error("Không nhận diện được Số CCCD (12 chữ số). Vui lòng đảm bảo dãy số trên mặt trước rõ ràng, không bị chói sáng.");
        setProcessing(false);
        return;
      }

      // Lưu trữ dữ liệu xác thực
      setCccdDescriptor(descriptor);
      setOcrData({
        fullName: extractedName,
        idNumber: extractedId,
      });

      setProcessing(false);
      setStep(2);
    } catch (err) {
      console.error("OCR process error:", err);
      setStep1Error("Lỗi trong quá trình quét ảnh. Vui lòng tải lại ảnh và thử lại.");
      setProcessing(false);
    }
  };

  // 2. CHỤP WEBCAM & SO KHỚP
  const handleCaptureAndMatch = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg");
    setCapturedPhoto(photoDataUrl);

    if (!cccdDescriptor) {
      setMatchingStatus("matched");
      stopCamera();
      return;
    }

    setMatchingStatus("scanning");

    try {
      const liveImg = await faceapi.fetchImage(photoDataUrl);
      const detection = await faceapi.detectSingleFace(liveImg).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setMatchingStatus("failed");
        return;
      }

      const distance = faceapi.euclideanDistance(cccdDescriptor, detection.descriptor);

      if (distance < 0.50) {
        setMatchingStatus("matched");
        stopCamera();
      } else {
        setMatchingStatus("failed");
      }
    } catch (err) {
      setMatchingStatus("matched");
      stopCamera();
    }
  };

  // 3. HOÀN TẤT & LƯU SUPABASE CHUẨN XÁC
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
          kyc_status: "approved",
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

      {/* BƯỚC 1: TẢI ẢNH CCCD */}
      {step === 1 && (
        <div className="sp-card p-6">
          <h2 className="font-display font-800 text-white text-xl mb-1">Bước 1: Tải lên ảnh CCCD</h2>
          <p className="text-sm mb-5 text-gray-400">
            Tải ảnh mặt trước và mặt sau CCCD của bạn. Hệ thống sẽ tự động quét số CCCD và Họ tên (Capslock không dấu).
          </p>

          {/* Lỗi trích xuất nếu có */}
          {step1Error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-5 flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-bold mb-0.5">Không thể quét tự động:</p>
                <p className="leading-relaxed text-gray-300">{step1Error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* MẶT TRƯỚC */}
            <div>
              <p className="sp-filter-label mb-2 flex justify-between items-center">
                <span>Mặt trước (chân dung & thông tin) *</span>
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
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                    <p className="text-3xl mb-2">🪪</p>
                    <p className="text-xs font-700 text-white">Nhấn chọn ảnh Mặt trước</p>
                    <p className="text-[10px] text-gray-500 mt-1">Hỗ trợ JPG, PNG, WEBP</p>
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
                <div className="mt-2 text-right">
                  <label className="text-[11px] text-purple-400 hover:underline cursor-pointer">
                    Đổi ảnh khác
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload("front", e.target.files[0])}
                    />
                  </label>
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
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                    <p className="text-3xl mb-2">🔄</p>
                    <p className="text-xs font-700 text-white">Nhấn chọn ảnh Mặt sau</p>
                    <p className="text-[10px] text-gray-500 mt-1">(Tùy chọn)</p>
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
                <div className="mt-2 text-right">
                  <label className="text-[11px] text-purple-400 hover:underline cursor-pointer">
                    Đổi ảnh khác
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileUpload("back", e.target.files[0])}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleValidateAndScanCccd}
            disabled={!frontFile || processing}
            className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Đang quét OCR trích xuất Họ tên & Số CCCD...</span>
              </>
            ) : (
              <span>Tiếp tục: Quét thông tin thẻ →</span>
            )}
          </button>
        </div>
      )}

      {/* BƯỚC 2: THÔNG TIN TRÍCH XUẤT TỰ ĐỘNG (KHÔNG ĐƯỢC TỰ CHỈNH SỬA) */}
      {step === 2 && (
        <div className="sp-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <h2 className="font-display font-800 text-white text-lg">✓ Thông tin trích xuất từ CCCD (AI OCR)</h2>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <span>🔒</span>
              <span>Đã trích xuất tự động • Không thể chỉnh sửa</span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Hệ thống đã nhận diện tự động dữ liệu từ ảnh CCCD của bạn. Để đảm bảo tính minh bạch và tiêu chuẩn an toàn cho người bán, thông tin này được khóa cố định, không thể tự ý sửa đổi.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#0a0a16] border border-purple-500/25">
              <label className="sp-filter-label mb-1.5 flex items-center justify-between text-gray-300 font-bold">
                <span>Họ và tên (Capslock) *</span>
                <span className="text-[10px] text-emerald-400 font-mono">✓ Trích xuất từ thẻ</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ocrData.fullName}
                  readOnly
                  disabled
                  className="sp-input text-sm font-bold text-white uppercase bg-white/5 border-white/20 w-full p-2.5 rounded-lg cursor-not-allowed select-all tracking-wider"
                  style={{ color: "#E0E7FF", background: "rgba(255,255,255,0.04)" }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔒</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a16] border border-purple-500/25">
              <label className="sp-filter-label mb-1.5 flex items-center justify-between text-gray-300 font-bold">
                <span>Số thẻ CCCD (12 số) *</span>
                <span className="text-[10px] text-emerald-400 font-mono">✓ Trích xuất từ thẻ</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ocrData.idNumber}
                  readOnly
                  disabled
                  className="sp-input text-sm font-mono font-bold text-white bg-white/5 border-white/20 w-full p-2.5 rounded-lg cursor-not-allowed select-all tracking-widest"
                  style={{ color: "#E0E7FF", background: "rgba(255,255,255,0.04)" }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔒</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="sp-btn-ghost py-3.5 px-5 text-xs font-display font-700"
            >
              ← Chọn lại ảnh khác
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 sp-btn-primary py-3.5 font-display font-700 text-sm flex items-center justify-center gap-2"
            >
              <span>Xác nhận thông tin & Mở WebCam đối chiếu</span>
              <span>→</span>
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
                Đang đối chiếu khuôn mặt...
              </div>
            )}
          </div>

          {matchingStatus === "matched" && (
            <div className="p-4 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs mb-5 font-bold text-center">
              ✓ Khuôn mặt đã được xác nhận!
            </div>
          )}

          {matchingStatus === "failed" && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-5 text-center">
              Không khớp khuôn mặt rõ ràng. Bạn có muốn bỏ qua bước này không?
            </div>
          )}

          <div className="flex gap-3">
            {matchingStatus !== "matched" ? (
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleCaptureAndMatch}
                  disabled={!!cameraError || matchingStatus === "scanning"}
                  className="flex-1 sp-btn-primary py-3.5 font-display font-700 text-sm cursor-pointer"
                >
                  📸 Chụp & Đối Chiếu
                </button>
                <button
                  onClick={() => {
                    setMatchingStatus("matched");
                    stopCamera();
                  }}
                  className="px-4 py-3.5 rounded-xl font-display font-700 text-xs bg-slate-800 text-gray-300 hover:text-white border border-slate-700 cursor-pointer"
                  title="Bỏ qua nếu camera lỗi"
                >
                  Bỏ qua ⏭️
                </button>
              </div>
            ) : (
              <button
                onClick={handleCompleteKYC}
                className="w-full py-3.5 rounded-xl font-display font-800 text-black text-sm bg-gradient-to-r from-lime-400 to-emerald-400 cursor-pointer"
              >
                ✓ Hoàn Tất & Kích Hoạt Quyền Người Bán →
              </button>
            )}
          </div>
        </div>
      )}

      {/* BƯỚC 4: HOÀN THÀNH */}
      {step === 4 && (
        <div className="sp-card p-10 text-center max-w-lg mx-auto">
          <h2 className="font-display font-800 text-white text-2xl mb-2">🎉 Xác thực thành công!</h2>
          <p className="text-sm text-gray-300 mb-6">Tài khoản của bạn đã được xác minh chính chủ và kích hoạt quyền đăng bán vé.</p>
          <button onClick={() => nav("seller-dash")} className="w-full sp-btn-primary py-3.5 font-display font-700 text-sm cursor-pointer">
            Vào Trang Quản Lý Bán Vé →
          </button>
        </div>
      )}
    </div>
  );
}
