import React from "react";
import { AppProvider, useApp } from "./context";
import Navbar from "./components/Navbar";
import SafePassLogo from "./components/Logo";
import Marketplace from "./pages/Marketplace";
import EventDetail from "./pages/EventDetail";
import KYCFlow from "./pages/KYCFlow";
import Profile from "./pages/Profile";
import SellerDash from "./pages/SellerDash";
import NewListing from "./pages/NewListing";
import MyTickets from "./pages/MyTickets";
import Dispute from "./pages/Dispute";
import DisputeCenter from "./pages/DisputeCenter";
import CheckoutModal from "./modals/Checkout";
import AuthModal from "./modals/Auth";
import RegisteredUsersModal from "./modals/RegisteredUsersModal";

function AppContent() {
  const { view, checkoutTicket, disputeTicket, authModal, t } = useApp();

  const PAGE: Record<string, React.ReactNode> = {
    marketplace: <Marketplace />,
    "event-detail": <EventDetail />,
    kyc: <KYCFlow />,
    profile: <Profile />,
    "seller-dash": <SellerDash />,
    "new-listing": <NewListing />,
    "my-tickets": <MyTickets />,
    dispute: <Dispute />,
    "dispute-center": <DisputeCenter />,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#070711" }}>
      <Navbar />
      <main className="flex-1">{PAGE[view] ?? <Marketplace />}</main>

      {checkoutTicket && <CheckoutModal />}
      {disputeTicket && view !== "dispute" && null}
      {authModal !== "none" && <AuthModal />}
      <RegisteredUsersModal />

      {/* Footer */}
      <footer className="mt-auto py-10" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-[1680px] mx-auto px-5 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SafePassLogo size={34} showText slogan={t.appSlogan} />
          <div className="flex gap-6 text-xs" style={{ color: "#4b5563" }}>
            <a href="#" className="hover:text-white transition-colors">{t.footerTerms}</a>
            <a href="#" className="hover:text-white transition-colors">{t.footerPrivacy}</a>
            <a href="#" className="hover:text-white transition-colors">{t.footerSupport}</a>
            <span>{t.copyright}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
