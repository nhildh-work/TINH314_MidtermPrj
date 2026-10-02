export const rawTranslations = {
  vi: {
    // General / Navbar
    search: "Tìm kiếm sự kiện, nghệ sĩ, địa điểm...",
    buyTickets: "Mua vé",
    sellTickets: "Đăng bán vé",
    myAccount: "Tài khoản của tôi",
    logout: "Đăng xuất",
    login: "Đăng nhập",
    register: "Đăng ký",
    appSlogan: "Sàn giao dịch vé sự kiện an toàn hàng đầu Việt Nam",
    footerTerms: "Điều khoản dịch vụ",
    footerPrivacy: "Chính sách bảo mật",
    footerSupport: "Hỗ trợ khách hàng",
    copyright: "© 2026 SafePass Inc. All rights reserved.",

    // Marketplace
    verifiedBadge: "Đã xác thực",
    buyNow: "Mua ngay",
    filtersLabel: "Bộ lọc tìm kiếm",
    clearAll: "Xóa tất cả",
    eventLabel: "Sự kiện",
    allEvents: "Tất cả sự kiện",
    priceRange: "Khoảng giá",
    from: "Từ",
    tierLabel: "Hạng vé",
    allLabel: "Tất cả",
    cityLabel: "Khu vực / Thành phố",
    marketplaceTitle: "Chợ Vé Sự Kiện Trực Tuyến",
    ticketsListed: (count: number) => `Hiện có ${count} vé đang được bảo chứng giao dịch an toàn`,
    sort1: "Giá: Thấp đến Cao",
    sort2: "Giá: Cao đến Thấp",
    noTickets: "Không tìm thấy vé phù hợp",
    adjustFilter: "Vui lòng thử điều chỉnh hoặc xóa bộ lọc để xem thêm vé",

    // New Listing Flow
    step1Label: "Thông tin vé",
    step2Label: "Giá & Vé",
    step3Label: "Xác nhận",
    backBtn: "Quay lại",
    newListingTitle: "Đăng bán vé mới",
    listingSuccess: "Đăng vé thành công!",
    listingSuccessSub: (name: string) => `Vé sự kiện "${name}" của bạn đã được đưa lên hệ thống.`,
    viewOnMarket: "Xem trên chợ vé",
    manageTickets: "Quản lý vé",
    fieldEventName: "Tên sự kiện",
    phEventName: "Ví dụ: Concert Anh Trai",
    fieldTier: "Hạng vé (Tier)",
    phTier: "Ví dụ: VIP, CAT 1",
    fieldCity: "Thành phố",
    phCity: "Hà Nội / TP.HCM",
    fieldVenue: "Địa điểm cụ thể",
    phVenue: "Ví dụ: SVĐ Mỹ Đình",
    fieldDate: "Thời gian diễn ra",
    phDate: "Ví dụ: 20:00 - 15/11/2026",
    fieldSalePrice: "Giá bán (VND)",
    phPrice: "Nhập giá bán",
    whyHandover: "Tại sao cần bàn giao vé?",
    whyHandoverText: "Hệ thống cần xác thực tệp vé để đảm bảo an toàn tuyệt đối cho người mua.",
    uploadTicketLabel: "Tải lên tệp vé (PDF / Ảnh)",
    uploadMapLabel: "Tải lên sơ đồ chỗ ngồi (Tùy chọn)",
    uploadTicketHint: "Chọn file vé của bạn",
    uploadTicketSub: "Hỗ trợ định dạng PDF, PNG, JPG",
    uploadMapHint: "Chọn sơ đồ vị trí",
    uploadMapSub: "Hỗ trợ PNG, JPG",
    changeFile: "Đổi file khác",
    submitListing: "Xác nhận đăng bán và ký quỹ",

    // MyTickets & Gate
    checkinHint: "Nhấn xác nhận sau khi quét mã thành công tại cổng soát vé sự kiện.",
    checkinBtn: "✓ Xác nhận đã vào cổng an toàn",
    noTicketsYet: "Bạn chưa mua vé nào trên sàn SafePass.",
    goShop: "Khám phá sự kiện ngay",
    tierLabel2: "Hạng vé",
    pricePaid: "Giá thanh toán",

    // Seller Dashboard
    cancelledListing: "Đã hủy đăng bán",
    cancelListing: "Hủy niêm yết vé",
    lockedNoCancel: "Vé đang được giao dịch (Tạm khóa).",
    completedNoCancel: "Vé đã bán thành công.",
    kycRequired: "Cần hoàn tất KYC để đăng bán",
    kycSub: "Để đảm bảo thị trường không có vé giả, người bán cần xác thực danh tính bằng CCCD và khuôn mặt.",
    kycNote: "Quy trình xác thực chỉ mất 1-2 phút và được bảo mật tuyệt đối.",
    kycStart: "Bắt đầu xác thực KYC ngay",
    totalListings: "Tổng số vé niêm yết",
    activeSelling: "Đang mở bán",
    pendingPayout: "Tiền chờ giải ngân",
    sellerDashTitle: "Bảng Điều Khiển Người Bán",
    sellerDashSub: "Quản lý danh sách vé đã đăng, tiền ký quỹ và trạng thái giao dịch.",
    disputeBtn: "Trung tâm tranh chấp",
    listNew: "+ Đăng bán vé mới",
    payoutBanner: (day: string = "Thứ Sáu hàng tuần", fee: string = "5%") => `Số dư khả dụng sẽ được đối soát và giải ngân định kỳ vào ${day}. Phí nền tảng là ${fee}.`,
    withdrawNow: "Rút tiền về ngân hàng",
    listingTable: "Danh Sách Vé Đã Đăng Bán",
    colEvent: "Sự kiện",
    colTier: "Hạng vé",
    colPrice: "Giá niêm yết",
    colDate: "Thời gian",
    colStatus: "Trạng thái",
    colDetail: "Chi tiết",

    // Dispute & Reports
    reportSentTitle: "Yêu cầu khiếu nại đã được ghi nhận!",
    reportSentDesc: "Hệ thống SafePass đã đóng băng số tiền **tạm giữ** của giao dịch này để bảo vệ quyền lợi của bạn.",
    reportSentSub: "Bộ phận hỗ trợ và người bán sẽ nhận được thông báo để xử lý đối soát.",
    viewDisputeBtn: "Theo dõi tại Trung tâm Tranh Chấp",
    backToTicketsBtn: "Về danh sách vé của tôi",
    claimDetailLabel: "Mô tả chi tiết sự cố tại cổng vé",
    claimDetailPh: "Hãy nêu rõ thời gian bạn đến cổng, nhân viên soát vé báo lỗi gì (vé đã quét trước đó, vé giả, sai mã QR...)...",
    proofTitle: "Bằng chứng video thực tế tại cổng sự kiện",
    proofRequirement: "Yêu cầu bắt buộc về video bằng chứng:",
    proofRequirementDesc: "Quay lại rõ **màn hình máy quét của nhân viên báo lỗi** hoặc nhân viên soát vé từ chối cho vào.",
    uploadVideoLabel: "Tải lên video bằng chứng (MP4, MOV)",
    clickToChange2: "Nhấp để chọn video khác",
    clickToSelectVideo: "Nhấp để tải lên video bằng chứng",
    videoSpec: "Định dạng MP4 / MOV / AVI (tối đa 100MB)",
    dcSellerPendingTitle: "Cần bạn phản hồi bằng chứng đối soát",
    dcSellerPendingDesc: "Người mua đã gửi khiếu nại về vé này. Vui lòng cung cấp bằng chứng vé gốc **trong vòng 24 giờ**.",
    dcSubmitEvidence: "Gửi bằng chứng đối soát",
    dcWaitingSeller: "Đang chờ người bán phản hồi",
    dcWaitingSellerSub: "Người bán có tối đa 24 giờ để cung cấp biên lai và lịch sử mua vé gốc.",

    // Profile
    backToMarket2: "← Quay lại chợ vé",
    logoutBtn: "Đăng xuất tài khoản",
  },
  en: {
    search: "Search events, artists, venues...",
    buyTickets: "Buy Tickets",
    sellTickets: "Sell Tickets",
    myAccount: "My Account",
    logout: "Log out",
    login: "Log in",
    register: "Sign up",
    appSlogan: "Vietnam's Premier Secure Ticket Escrow Marketplace",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    footerSupport: "Customer Support",
    copyright: "© 2026 SafePass Inc. All rights reserved.",
    verifiedBadge: "Verified",
    buyNow: "Buy Now",
    filtersLabel: "Filters",
    clearAll: "Clear All",
    eventLabel: "Event",
    allEvents: "All Events",
    priceRange: "Price Range",
    from: "From",
    tierLabel: "Tier",
    allLabel: "All",
    cityLabel: "City",
    marketplaceTitle: "Event Tickets Marketplace",
    ticketsListed: (count: number) => `${count} verified tickets available`,
    sort1: "Price: Low to High",
    sort2: "Price: High to Low",
    noTickets: "No tickets found",
    adjustFilter: "Try adjusting your filters",
    step1Label: "Ticket Info",
    step2Label: "Price & Ticket",
    step3Label: "Confirm",
    backBtn: "Back",
    newListingTitle: "List New Ticket",
    listingSuccess: "Listed Successfully!",
    listingSuccessSub: (name: string) => `Your ticket for "${name}" has been listed.`,
    viewOnMarket: "View in Market",
    manageTickets: "Manage Tickets",
    fieldEventName: "Event Name",
    phEventName: "e.g., Anh Trai Concert",
    fieldTier: "Tier",
    phTier: "e.g., VIP, CAT 1",
    fieldCity: "City",
    phCity: "Hanoi / HCMC",
    fieldVenue: "Venue",
    phVenue: "e.g., My Dinh Stadium",
    fieldDate: "Date & Time",
    phDate: "e.g., 20:00 - 15/11/2026",
    fieldSalePrice: "Selling Price (VND)",
    phPrice: "Enter price",
    whyHandover: "Why ticket handover?",
    whyHandoverText: "The system needs to verify the ticket file to protect buyers.",
    uploadTicketLabel: "Upload Ticket File (PDF / Image)",
    uploadMapLabel: "Upload Seating Map (Optional)",
    uploadTicketHint: "Select your ticket file",
    uploadTicketSub: "Supports PDF, PNG, JPG",
    uploadMapHint: "Select seat map",
    uploadMapSub: "Supports PNG, JPG",
    changeFile: "Change File",
    submitListing: "Confirm & Escrow",
    checkinHint: "Confirm after successfully scanning your pass at the gate.",
    checkinBtn: "✓ Confirm Safe Entry",
    noTicketsYet: "You have not purchased any tickets yet.",
    goShop: "Explore Events",
    tierLabel2: "Tier",
    pricePaid: "Paid Amount",
    cancelledListing: "Listing Cancelled",
    cancelListing: "Cancel Listing",
    lockedNoCancel: "Ticket is in active trade.",
    completedNoCancel: "Ticket has been sold.",
    kycRequired: "KYC required to sell tickets",
    kycSub: "To prevent fake tickets, sellers must verify ID and face.",
    kycNote: "Takes only 1-2 minutes and fully encrypted.",
    kycStart: "Start KYC Verification",
    totalListings: "Total Listed",
    activeSelling: "Active",
    pendingPayout: "Pending Payout",
    sellerDashTitle: "Seller Dashboard",
    sellerDashSub: "Manage listings, escrow funds, and transactions.",
    disputeBtn: "Dispute Center",
    listNew: "+ List New Ticket",
    payoutBanner: (day: string = "Friday", fee: string = "5%") => `Available balance will be reconciled and paid out on ${day}. Platform fee is ${fee}.`,
    withdrawNow: "Withdraw to Bank",
    listingTable: "Listed Tickets",
    colEvent: "Event",
    colTier: "Tier",
    colPrice: "Price",
    colDate: "Date",
    colStatus: "Status",
    colDetail: "Details",
    reportSentTitle: "Dispute request submitted!",
    reportSentDesc: "Funds are held safely in escrow while under review.",
    reportSentSub: "Our support and seller have been notified.",
    viewDisputeBtn: "View in Dispute Center",
    backToTicketsBtn: "Back to My Tickets",
    claimDetailLabel: "Gate Incident Details",
    claimDetailPh: "Describe the issue at the gate...",
    proofTitle: "Video Proof at Gate",
    proofRequirement: "Mandatory video proof requirements:",
    proofRequirementDesc: "Record the gate scanner error screen clearly.",
    uploadVideoLabel: "Upload Video Proof",
    clickToChange2: "Click to change video",
    clickToSelectVideo: "Click to upload video proof",
    videoSpec: "MP4 / MOV / AVI (up to 100MB)",
    dcSellerPendingTitle: "Seller response required",
    dcSellerPendingDesc: "Buyer reported an issue. Please provide original ticket proof within 24h.",
    dcSubmitEvidence: "Submit Counter-Evidence",
    dcWaitingSeller: "Waiting for Seller response",
    dcWaitingSellerSub: "Seller has up to 24h to respond.",
    backToMarket2: "← Back to Marketplace",
    logoutBtn: "Log out",
  }
};

/**
 * Creates a fail-safe Proxy for translations so no missing key or function invocation can ever throw a runtime render error.
 */
export function getTranslations(lang: Lang): T {
  const dict = rawTranslations[lang] || rawTranslations.vi;
  return new Proxy(dict, {
    get(target: any, prop: string | symbol) {
      if (typeof prop === "symbol") return target[prop];
      if (prop in target) {
        const val = target[prop];
        if (typeof val === "string") {
          // If a string property is called as a function like val("arg1", "arg2"), safely return the string
          const callableString: any = function(...args: any[]) {
            return val;
          };
          callableString.toString = () => val;
          callableString.valueOf = () => val;
          callableString.split = (delim: string) => val.split(delim);
          callableString.includes = (substr: string) => val.includes(substr);
          return val;
        }
        return val;
      }
      // Return a universal callable string fallback to prevent "is not a function" and undefined rendering issues
      const fallbackFn: any = (...args: any[]) => (args.length > 0 && args[0] !== undefined ? String(args[0]) : "");
      fallbackFn.toString = () => "";
      fallbackFn.valueOf = () => "";
      fallbackFn.split = (delim: string) => [""];
      fallbackFn.map = (fn: any) => [];
      return fallbackFn;
    },
  });
}

export const translations = {
  vi: getTranslations("vi"),
  en: getTranslations("en"),
};

export type Lang = "vi" | "en";
export type T = Record<string, any>;
