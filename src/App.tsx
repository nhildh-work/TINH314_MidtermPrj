import React, { Component, type ErrorInfo, type ReactNode } from "react";
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SafePass Runtime Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#070711] text-white">
          <div className="sp-card max-w-lg w-full p-8 text-center space-y-4 border border-red-500/30">
            <div className="text-5xl">⚠️</div>
            <h2 className="font-display font-800 text-xl text-red-400">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              {this.state.error?.message || "Một lỗi không mong muốn đã xảy ra trong quá trình thao tác."}
            </p>
            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="sp-btn-primary px-5 py-2.5 text-xs font-display font-700"
              >
                🔄 Tải lại trang
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="sp-btn-ghost px-5 py-2.5 text-xs font-display font-700"
              >
                🏠 Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { view, checkoutTicket, disputeTicket, authModal, t, selectedEvent } = useApp();

  const renderCurrentView = () => {
    switch (view) {
      case "marketplace":
        return <Marketplace />;
      case "event-detail":
        return selectedEvent ? <EventDetail /> : <Marketplace />;
      case "kyc":
        return <KYCFlow />;
      case "profile":
        return <Profile />;
      case "seller-dash":
        return <SellerDash />;
      case "new-listing":
        return <NewListing />;
      case "my-tickets":
        return <MyTickets />;
      case "dispute":
        return <Dispute />;
      case "dispute-center":
        return <DisputeCenter />;
      default:
        return <Marketplace />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#070711" }}>
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          {renderCurrentView()}
        </ErrorBoundary>
      </main>

      {checkoutTicket && <CheckoutModal />}
      {disputeTicket && view !== "dispute" && null}
      {authModal !== "none" && (
        <ErrorBoundary>
          <AuthModal />
        </ErrorBoundary>
      )}
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
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
