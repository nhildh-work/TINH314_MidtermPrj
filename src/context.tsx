import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { View, Role, KycStatus, EventData, TicketListing, MyTicket } from "./data";
import type { Lang, T } from "./i18n";
import { translations } from "./i18n";
import { supabase, type ProfileRecord } from "./lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface AppCtx {
  view: View;
  nav: (v: View) => void;
  role: Role;
  setRole: (r: Role) => void;
  cartCount: number;
  addToCart: () => void;
  selectedEvent: EventData | null;
  setSelectedEvent: (e: EventData | null) => void;
  checkoutTicket: TicketListing | null;
  openCheckout: (t: TicketListing) => void;
  closeCheckout: () => void;
  disputeTicket: MyTicket | null;
  openDispute: (t: MyTicket) => void;
  closeDispute: () => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (b: boolean) => void;
  currentUser: User | null;
  currentProfile: ProfileRecord | null;
  refreshProfile: () => Promise<void>;
  kycStatus: KycStatus;
  setKycStatus: (s: KycStatus) => void;
  authModal: "none" | "login" | "register";
  setAuthModal: (m: "none" | "login" | "register") => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
  dynamicMarketListings: TicketListing[];
  setDynamicMarketListings: (listings: TicketListing[]) => void;
  ticketsListed: () => TicketListing[];
  pendingDisputes: PendingDispute[];
  addPendingDispute: (d: PendingDispute) => void;
  reportedTicketIds: number[];
  addReportedTicket: (id: number) => void;
  // Purchased tickets
  purchasedTickets: MyTicket[];
  addPurchasedTicket: (t: MyTicket) => void;
  // User Management
  registeredUsers: ProfileRecord[];
  showUsersModal: boolean;
  setShowUsersModal: (show: boolean) => void;
  loginAsUser: (profile: ProfileRecord) => void;
  registerUserDirect: (record: { fullName: string; email: string; phone?: string; role: "buyer" | "seller" | "admin"; provider?: "email" | "google"; avatarUrl?: string }) => ProfileRecord;
  deleteRegisteredUser: (id: string) => void;
}

export interface PendingDispute {
  id: string;
  ticketTitle: string;
  tier: string;
  amount: number;
  buyerReason: string;
  buyerDetail: string;
  buyerVideo: string;
  buyerSubmittedAt: string;
}

const STORAGE_USERS_KEY = "safepass_registered_users";
const STORAGE_CURRENT_PROFILE_KEY = "safepass_current_profile";

const INITIAL_USERS: ProfileRecord[] = [
  {
    id: "sp-usr-admin",
    full_name: "Admin SafePass (Ban Quản Trị)",
    email: "admin@safepass.vn",
    role: "admin",
    phone: "0909 888 999",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
    provider: "email",
    created_at: "2026-03-01T08:00:00Z",
  },
  {
    id: "sp-usr-1",
    full_name: "Lê Đoàn Huyền Nhi",
    email: "huyennhi.le@gmail.com",
    role: "seller",
    phone: "0901 234 567",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
    provider: "google",
    created_at: "2026-03-12T10:30:00Z",
  },
  {
    id: "sp-usr-2",
    full_name: "Trần Minh Quân",
    email: "minhquan.tran@gmail.com",
    role: "buyer",
    phone: "0988 123 456",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
    provider: "google",
    created_at: "2026-03-18T14:20:00Z",
  },
];

const Ctx = createContext<AppCtx>(null!);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("marketplace");
  const [role, setRole] = useState<Role>("buyer");
  const [cartCount, setCartCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [checkoutTicket, setCheckoutTicket] = useState<TicketListing | null>(null);
  const [disputeTicket, setDisputeTicket] = useState<MyTicket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileRecord | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>("none");
  const [authModal, setAuthModal] = useState<"none" | "login" | "register">("none");
  const [lang, setLang] = useState<Lang>("vi");
  const [dynamicMarketListings, setDynamicMarketListings] = useState<TicketListing[]>([]);
  const [pendingDisputes, setPendingDisputes] = useState<PendingDispute[]>([]);
  const [reportedTicketIds, setReportedTicketIds] = useState<number[]>([]);

  // Registered users state
  const [registeredUsers, setRegisteredUsers] = useState<ProfileRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error reading stored users:", e);
    }
    return INITIAL_USERS;
  });

  const [showUsersModal, setShowUsersModal] = useState(false);

  // Purchased tickets state
  const [purchasedTickets, setPurchasedTickets] = useState<MyTicket[]>(() => {
    try {
      const stored = localStorage.getItem("safepass_purchased_tickets");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Error reading purchased tickets:", e);
    }
    return [];
  });

  const addPurchasedTicket = (ticket: MyTicket) => {
    setPurchasedTickets(prev => {
      const updated = [ticket, ...prev];
      try {
        localStorage.setItem("safepass_purchased_tickets", JSON.stringify(updated));
      } catch (e) {
        console.warn("Error saving purchased tickets:", e);
      }
      return updated;
    });
  };

  // Save registered users to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(registeredUsers));
    } catch (e) {
      console.warn("Error saving users to storage:", e);
    }
  }, [registeredUsers]);

  // Load saved active profile from local storage on mount
  useEffect(() => {
    try {
      const savedProfileStr = localStorage.getItem(STORAGE_CURRENT_PROFILE_KEY);
      if (savedProfileStr) {
        const savedProfile: ProfileRecord = JSON.parse(savedProfileStr);
        if (savedProfile && savedProfile.id) {
          setCurrentProfile(savedProfile);
          if (savedProfile.role === "seller") setRole("seller");
          setCurrentUser({
            id: savedProfile.id,
            email: savedProfile.email || "",
            user_metadata: { full_name: savedProfile.full_name },
          } as unknown as User);
        }
      }
    } catch (e) {
      console.warn("Error loading saved current profile:", e);
    }
  }, []);

  const fetchProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data && !error) {
        const prof = data as ProfileRecord;
        setCurrentProfile(prof);
        localStorage.setItem(STORAGE_CURRENT_PROFILE_KEY, JSON.stringify(prof));
        if (prof.role === "seller") {
          setRole("seller");
        }
        setRegisteredUsers(prev => {
          const idx = prev.findIndex(u => u.id === prof.id || u.email === prof.email);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...prof };
            return copy;
          }
          return [prof, ...prev];
        });
      } else {
        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Người dùng SafePass";
        const metaAvatar =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        const newProf: ProfileRecord = {
          id: user.id,
          full_name: metaName,
          email: user.email || null,
          role: "buyer",
          avatar_url: metaAvatar,
          provider: "google",
          created_at: user.created_at || new Date().toISOString(),
        };

        setCurrentProfile(newProf);
        localStorage.setItem(STORAGE_CURRENT_PROFILE_KEY, JSON.stringify(newProf));
        setRegisteredUsers(prev => {
          if (!prev.find(u => u.id === newProf.id || u.email === newProf.email)) {
            return [newProf, ...prev];
          }
          return prev;
        });

        try {
          await supabase.from("profiles").upsert(newProf);
        } catch (dbErr) {
          console.warn("Could not upsert profile to Supabase:", dbErr);
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      if (user) {
        setCurrentUser(user);
        fetchProfile(user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (user) {
        setCurrentUser(user);
        fetchProfile(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const nav = (v: View) => { setView(v); window.scrollTo(0, 0); };

  const isLoggedIn = !!currentUser || !!currentProfile;

  const setIsLoggedIn = (b: boolean) => {
    if (!b) {
      try {
        supabase.auth.signOut();
      } catch (err) {
        console.warn("SignOut Supabase err:", err);
      }
      localStorage.removeItem(STORAGE_CURRENT_PROFILE_KEY);
      setCurrentUser(null);
      setCurrentProfile(null);
    }
  };

  const loginAsUser = (profile: ProfileRecord) => {
    setCurrentProfile(profile);
    setCurrentUser({
      id: profile.id,
      email: profile.email || "",
      user_metadata: { full_name: profile.full_name },
    } as unknown as User);
    if (profile.role === "seller") {
      setRole("seller");
    }
    localStorage.setItem(STORAGE_CURRENT_PROFILE_KEY, JSON.stringify(profile));
    setAuthModal("none");
  };

  const registerUserDirect = ({
    fullName,
    email,
    phone,
    role: userRole,
    provider = "email",
    avatarUrl,
  }: {
    fullName: string;
    email: string;
    phone?: string;
    role: "buyer" | "seller" | "admin";
    provider?: "email" | "google";
    avatarUrl?: string;
  }): ProfileRecord => {
    const existing = registeredUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      loginAsUser(existing);
      return existing;
    }

    const newRecord: ProfileRecord = {
      id: "sp-usr-" + Date.now(),
      full_name: fullName,
      email,
      phone: phone || "",
      role: userRole,
      provider,
      avatar_url: avatarUrl || (provider === "google"
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
        : null),
      created_at: new Date().toISOString(),
    };

    setRegisteredUsers(prev => [newRecord, ...prev]);
    loginAsUser(newRecord);

    supabase
      .from("profiles")
      .insert({
        id: newRecord.id,
        full_name: newRecord.full_name,
        email: newRecord.email,
        role: newRecord.role,
        avatar_url: newRecord.avatar_url,
        created_at: newRecord.created_at,
      })
      .then(({ error }) => {
        if (error) console.warn("Supabase profile sync notice:", error.message);
      })
      .catch(() => {});

    return newRecord;
  };

  const deleteRegisteredUser = (id: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== id));
    if (currentProfile?.id === id) {
      setIsLoggedIn(false);
    }
  };

  return (
    <Ctx.Provider value={{
      view, nav, role, setRole,
      cartCount, addToCart: () => setCartCount(c => c + 1),
      selectedEvent, setSelectedEvent,
      checkoutTicket,
      openCheckout: (t) => setCheckoutTicket(t),
      closeCheckout: () => setCheckoutTicket(null),
      disputeTicket,
      openDispute: (tk) => { setDisputeTicket(tk); setView("dispute"); window.scrollTo(0, 0); },
      closeDispute: () => setDisputeTicket(null),
      isLoggedIn, setIsLoggedIn,
      currentUser, currentProfile, refreshProfile,
      kycStatus, setKycStatus,
      authModal, setAuthModal,
      lang, setLang,
      t: translations[lang],
      dynamicMarketListings, setDynamicMarketListings,
      ticketsListed: () => dynamicMarketListings,
      pendingDisputes,
      addPendingDispute: (d) => setPendingDisputes(prev => [d, ...prev]),
      reportedTicketIds,
      addReportedTicket: (id) => setReportedTicketIds(prev => [...prev, id]),
      purchasedTickets,
      addPurchasedTicket,
      registeredUsers,
      showUsersModal,
      setShowUsersModal,
      loginAsUser,
      registerUserDirect,
      deleteRegisteredUser,
    }}>
      {children}
    </Ctx.Provider>
  );
}