import React from 'react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0d1e] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h2 className="text-lg font-display font-800 text-white">Điều Khoản & Chính Sách Giao Dịch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto text-sm text-gray-300 space-y-6">
          <p className="italic text-xs text-gray-500">Cập nhật lần cuối: Tháng 10/2026</p>
          <p>
            Bằng việc tích chọn "Tôi đã đọc và đồng ý", bạn xác nhận đã hiểu rõ và chấp nhận toàn bộ các điều khoản ràng buộc, cơ chế luân chuyển dòng tiền và chế tài xử lý vi phạm dưới đây. Văn bản này có giá trị pháp lý tương đương Hợp đồng điện tử căn cứ theo <strong>Điều 34 Luật Giao dịch điện tử 2023</strong>.
          </p>

          <section>
            <h3 className="text-white font-bold text-base mb-2">ĐIỀU 1: QUY ĐỊNH CHUNG & ĐỊNH DANH BẮT BUỘC (eKYC)</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Vai trò Nền tảng:</strong> Hệ thống hoạt động dưới hình thức Sàn giao dịch điện tử trung gian, cung cấp dịch vụ bảo vệ dòng tiền (Escrow). Nền tảng không trực tiếp sở hữu, phát hành hay thu mua vé.</li>
              <li><strong>Xác thực sinh trắc học bắt buộc:</strong> Nhằm triệt tiêu rủi ro lừa đảo, 100% người dùng <strong>bắt buộc phải vượt qua bước quét khuôn mặt (Face ID / eKYC)</strong> trước khi giao dịch. Dữ liệu này được mã hóa an toàn tuân thủ <strong>Điều 32 Bộ luật Dân sự 2015</strong>, chỉ được trích xuất khi có yêu cầu phục vụ điều tra tranh chấp.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold text-base mb-2">ĐIỀU 2: CHÍNH SÁCH DÀNH CHO NGƯỜI BÁN (SELLER)</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong className="text-purple-400">Phí nền tảng:</strong> Thu <strong>5%</strong> dựa trên tổng giá vé niêm yết (chỉ thu khi giao dịch hoàn tất thành công).</li>
              <li><strong className="text-purple-400">Cơ chế Ký quỹ:</strong> Theo Điều 328 BLDS 2015, người bán bắt buộc nạp tiền cọc tương đương <strong>25%</strong> giá trị vé mỗi khi tạo niêm yết. Hệ thống hoàn trả 100% cọc + 95% tiền vé nếu giao dịch thành công.</li>
              <li><strong className="text-red-400">Chế tài xử phạt:</strong> Nếu bán vé giả, tẩy xóa thông tin, hoặc bán 1 vé cho nhiều người: Tịch thu vĩnh viễn <strong>25%</strong> tiền cọc, khóa tài khoản và thiết bị. Nếu có dấu hiệu lừa đảo theo Điều 174 BLHS 2015, hồ sơ eKYC sẽ được chuyển cho cơ quan chức năng.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold text-base mb-2">ĐIỀU 3: CHÍNH SÁCH DÀNH CHO NGƯỜI MUA (BUYER)</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong className="text-blue-400">Phí bảo vệ giao dịch:</strong> Người mua thanh toán thêm <strong>5%</strong> phí dịch vụ để duy trì quỹ Escrow và đội xử lý tranh chấp.</li>
              <li><strong className="text-blue-400">Đóng băng dòng tiền:</strong> Hệ thống <strong>không chuyển tiền ngay</strong> cho Người bán. Tiền được giữ an toàn tới khi sự kiện kết thúc và không có khiếu nại.</li>
              <li><strong className="text-red-400">Chế tài chống lạm dụng:</strong> Nếu cố tình báo cáo sai (đã check-in nhưng khiếu nại đòi tiền), khiếu nại sẽ bị hủy, tiền chuyển cho người bán và tài khoản bị khóa vĩnh viễn.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold text-base mb-2">ĐIỀU 4: QUY TRÌNH GIẢI QUYẾT TRANH CHẤP & FAST-TRACK ESCROW</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Luồng Khẩn cấp (Sát giờ sự kiện):</strong> Áp dụng <strong>02 giờ</strong> trước giờ mở cửa. Người mua quay video liền mạch vé lỗi tại cổng. Admin xử lý trong 15-30 phút. Hoàn tiền <strong>100% ngay lập tức</strong> nếu lỗi từ vé.</li>
              <li><strong>Luồng Thông thường (Đối chất 02 giờ):</strong> Người bán có chính xác <strong>02 giờ</strong> để tải lên bằng chứng hợp lệ. Quá hạn không phản hồi hoặc bằng chứng giả mạo, hệ thống tự động hoàn tiền cho người mua và luộc cọc người bán.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold text-base mb-2">ĐIỀU 5: CƠ CHẾ KHÁNG CÁO (ĐẶC QUYỀN 01 LẦN)</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Thời hạn vàng 24H:</strong> Mỗi bên có 1 cơ hội kháng cáo trong 24 giờ kể từ phán quyết sơ thẩm. Bắt buộc phải có <strong>bằng chứng mới</strong> mang tính quyết định.</li>
              <li><strong>Đóng băng Cấp độ 2:</strong> Dòng tiền tiếp tục bị phong tỏa nghiêm ngặt chờ Senior Admin xử lý (SLA 48 giờ). Phán quyết phúc thẩm là kết quả cuối cùng.</li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="sp-btn-primary px-8 py-2.5 rounded-lg font-bold text-sm">
            Tôi đã hiểu và Đóng
          </button>
        </div>

      </div>
    </div>
  );
};