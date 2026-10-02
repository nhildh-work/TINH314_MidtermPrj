// src/components/FaceIDVerification.tsx
import React, { useState } from "react";

interface FaceIDVerificationProps {
  onVerified: () => void;
}

export const FaceIDVerification: React.FC<FaceIDVerificationProps> = ({ onVerified }) => {
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 800);
    }, 2000);
  };

  return (
    <div className="bg-[#0f0f23] border border-white/10 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl text-white">
      <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
        👤
      </div>
      <h3 className="font-display font-800 text-lg mb-2">Xác thực khuôn mặt (Face ID / eKYC)</h3>
      <p className="text-xs text-gray-400 mb-6 leading-relaxed">
        Theo quy định chống lừa đảo của SafePass, bạn cần hoàn tất quét xác thực sinh trắc học trước khi tiếp tục thao tác.
      </p>

      <div className="relative w-48 h-48 mx-auto mb-6 rounded-2xl overflow-hidden border-2 border-purple-500/40 bg-black/60 flex items-center justify-center">
        {success ? (
          <div className="text-5xl text-emerald-400 animate-bounce">✅</div>
        ) : scanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-900/30">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
            <p className="text-xs text-purple-300 font-bold mt-2">Đang quét sinh trắc học...</p>
          </div>
        ) : (
          <div className="text-4xl opacity-50">📷</div>
        )}
      </div>

      <button
        onClick={handleScan}
        disabled={scanning || success}
        className="w-full py-3 rounded-xl font-display font-700 text-white text-sm transition-all bg-purple-600 hover:bg-purple-700 disabled:opacity-50 cursor-pointer shadow-lg"
      >
        {success ? "Xác thực thành công!" : scanning ? "Đang xử lý khuôn mặt..." : "Bắt đầu quét Face ID"}
      </button>
    </div>
  );
};