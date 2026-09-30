export type View =
  | "marketplace"
  | "event-detail"
  | "kyc"
  | "profile"
  | "seller-dash"
  | "new-listing"
  | "my-tickets"
  | "dispute"
  | "dispute-center";

export type Role = "buyer" | "seller";
export type KycStatus = "none" | "step1" | "liveness" | "pending" | "approved";

export interface TierData {
  name: string;
  officialPrice: number;
  color: string;
}

export interface EventData {
  id: number;
  title: string;
  artist: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  image: string;
  soldPercent: number;
  tags: string[];
  tiers: TierData[];
}

export interface TicketListing {
  id: number;
  eventId: number;
  eventTitle: string;
  eventImage: string;
  eventDate: string;
  city: string;
  tier: string;
  tierColor: string;
  section: string;
  seat: string;
  price: number;
  officialPrice: number;
  sellerName: string;
  sellerScore: number;
  sellerReviews: number;
  verified: boolean;
  minimapUrl?: string;
}

export interface MyTicket {
  id: number;
  eventTitle: string;
  eventImage: string;
  tier: string;
  date: string;
  venue: string;
  price: number;
  status: "locked" | "available" | "completed" | "dispute";
}

export interface MyListing {
  id: number;
  eventTitle: string;
  tier: string;
  price: number;
  status: "available" | "locked" | "completed";
  date: string;
}

export const EVENTS: EventData[] = [
  {
    id: 1,
    title: "Anh Trai Vượt Ngàn Chông Gai – Đêm Gala 2026",
    artist: "ATVNCG Full Cast",
    category: "music",
    date: "05 Tháng 11, 2026",
    time: "19:30",
    venue: "Nhà thi đấu Phú Thọ",
    city: "TP.HCM",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=600&fit=crop&auto=format",
    soldPercent: 89,
    tags: ["HOT", "SẮP HẾT"],
    tiers: [
      { name: "GA Đứng", officialPrice: 800000, color: "#8B5CF6" },
      { name: "Hạng B", officialPrice: 1200000, color: "#22D3EE" },
      { name: "Hạng A", officialPrice: 1800000, color: "#F472B6" },
      { name: "VIP", officialPrice: 3000000, color: "#FBBF24" },
    ],
  },
  {
    id: 2,
    title: "BLACKPINK World Tour – Born Pink Final",
    artist: "BLACKPINK",
    category: "music",
    date: "20 Tháng 10, 2026",
    time: "19:00",
    venue: "SVĐ Mỹ Đình",
    city: "Hà Nội",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=600&fit=crop&auto=format",
    soldPercent: 95,
    tags: ["SẮP HẾT"],
    tiers: [
      { name: "Zone A", officialPrice: 1500000, color: "#F472B6" },
      { name: "Zone B", officialPrice: 1000000, color: "#8B5CF6" },
      { name: "VIP Pit", officialPrice: 3500000, color: "#FBBF24" },
    ],
  },
  {
    id: 3,
    title: "Sơn Tùng M-TP – Sky Tour Live in Concert",
    artist: "Sơn Tùng M-TP",
    category: "music",
    date: "22 Tháng 11, 2026",
    time: "20:00",
    venue: "SVĐ Phú Thọ",
    city: "TP.HCM",
    image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&h=600&fit=crop&auto=format",
    soldPercent: 72,
    tags: ["MỚI"],
    tiers: [
      { name: "GA", officialPrice: 700000, color: "#8B5CF6" },
      { name: "Gold", officialPrice: 1500000, color: "#FBBF24" },
    ],
  },
  {
    id: 4,
    title: "Saigon Electronic Music Festival 2026",
    artist: "Various DJs",
    category: "festival",
    date: "15 Tháng 12, 2026",
    time: "18:00",
    venue: "Landmark 81 Rooftop",
    city: "TP.HCM",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=600&fit=crop&auto=format",
    soldPercent: 43,
    tags: ["MỚI"],
    tiers: [
      { name: "General", officialPrice: 400000, color: "#22D3EE" },
      { name: "VIP Lounge", officialPrice: 900000, color: "#F472B6" },
    ],
  },
];

export const TICKET_LISTINGS: TicketListing[] = [
  {
    id: 1, eventId: 1,
    eventTitle: "Anh Trai Vượt Ngàn Chông Gai – Đêm Gala 2026",
    eventImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
    eventDate: "05 Tháng 11, 2026", city: "TP.HCM",
    tier: "GA Đứng", tierColor: "#8B5CF6",
    section: "Lô A3", seat: "Tự do",
    price: 950000, officialPrice: 800000,
    sellerName: "Minh T.", sellerScore: 4.9, sellerReviews: 47, verified: true,
  },
  {
    id: 2, eventId: 1,
    eventTitle: "Anh Trai Vượt Ngàn Chông Gai – Đêm Gala 2026",
    eventImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
    eventDate: "05 Tháng 11, 2026", city: "TP.HCM",
    tier: "Hạng A", tierColor: "#F472B6",
    section: "Block B2", seat: "Ghế 15",
    price: 2100000, officialPrice: 1800000,
    sellerName: "Lan H.", sellerScore: 4.7, sellerReviews: 23, verified: true,
  },
  {
    id: 3, eventId: 2,
    eventTitle: "BLACKPINK World Tour – Born Pink Final",
    eventImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop&auto=format",
    eventDate: "20 Tháng 10, 2026", city: "Hà Nội",
    tier: "Zone A", tierColor: "#F472B6",
    section: "Khu A", seat: "Row 5, Số 22",
    price: 1800000, officialPrice: 1500000,
    sellerName: "Thu N.", sellerScore: 5.0, sellerReviews: 112, verified: true,
  },
  {
    id: 4, eventId: 2,
    eventTitle: "BLACKPINK World Tour – Born Pink Final",
    eventImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop&auto=format",
    eventDate: "20 Tháng 10, 2026", city: "Hà Nội",
    tier: "Zone B", tierColor: "#8B5CF6",
    section: "Khu B", seat: "Row 12, Số 8",
    price: 1100000, officialPrice: 1000000,
    sellerName: "Khoa P.", sellerScore: 4.6, sellerReviews: 8, verified: false,
  },
  {
    id: 5, eventId: 3,
    eventTitle: "Sơn Tùng M-TP – Sky Tour Live in Concert",
    eventImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=400&fit=crop&auto=format",
    eventDate: "22 Tháng 11, 2026", city: "TP.HCM",
    tier: "Gold", tierColor: "#FBBF24",
    section: "Block VIP", seat: "Ghế 7",
    price: 1700000, officialPrice: 1500000,
    sellerName: "Huy T.", sellerScore: 4.8, sellerReviews: 31, verified: true,
  },
  {
    id: 6, eventId: 4,
    eventTitle: "Saigon Electronic Music Festival 2026",
    eventImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop&auto=format",
    eventDate: "15 Tháng 12, 2026", city: "TP.HCM",
    tier: "VIP Lounge", tierColor: "#F472B6",
    section: "Lounge A", seat: "Table 3",
    price: 980000, officialPrice: 900000,
    sellerName: "Mai L.", sellerScore: 4.9, sellerReviews: 67, verified: true,
  },
];

export const MY_TICKETS: MyTicket[] = [
  {
    id: 1,
    eventTitle: "Anh Trai Vượt Ngàn Chông Gai – Đêm Gala 2026",
    eventImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&auto=format",
    tier: "GA Đứng", date: "05 Tháng 11, 2026 · 19:30",
    venue: "Nhà thi đấu Phú Thọ, TP.HCM", price: 950000, status: "locked",
  },
  {
    id: 2,
    eventTitle: "Saigon Electronic Music Festival 2026",
    eventImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop&auto=format",
    tier: "VIP Lounge", date: "15 Tháng 12, 2026 · 18:00",
    venue: "Landmark 81 Rooftop, TP.HCM", price: 980000, status: "completed",
  },
];

export const MY_LISTINGS: MyListing[] = [
  { id: 1, eventTitle: "BLACKPINK World Tour – Born Pink Final", tier: "Zone B", price: 1100000, status: "available", date: "20 Tháng 10, 2026" },
  { id: 2, eventTitle: "Sơn Tùng M-TP – Sky Tour Live", tier: "Gold", price: 1700000, status: "locked", date: "22 Tháng 11, 2026" },
  { id: 3, eventTitle: "Saigon Electronic Music Festival", tier: "VIP Lounge", price: 980000, status: "completed", date: "15 Tháng 12, 2026" },
];
