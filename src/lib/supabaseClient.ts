import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gmivplkfyerenmrcrmmv.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaXZwbGtmeWVyZW5tcmNybW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTcyMzAsImV4cCI6MjEwNjI5MzIzMH0.SeITYO1N6SYksV0Ey05y4BhDBG1KfcEK5hwkaKkxWek";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "buyer" | "seller" | "admin";
  avatar_url: string | null;
  phone?: string | null;
  provider?: "email" | "google";
  kyc_status?: string | null;
  is_verified?: boolean | null;
  cccd_number?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  created_at: string;
}

export interface TicketRecord {
  id: number;
  seller_id: string;
  event_name: string;
  price: number;
  status: "available" | "locked" | "sold";
  tier?: string;
  city?: string;
  venue?: string;
  event_date?: string;
  event_image?: string;
  section?: string;
  seat?: string;
  created_at: string;
  profiles?: ProfileRecord;
}
