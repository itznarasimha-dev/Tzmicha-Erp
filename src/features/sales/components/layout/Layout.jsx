import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({
  children,
  onOpenNewOrder,
  onOpenNewQuotation,
  onOpenNewExpense,
  onOpenProfile,
  onOpenProfileSettings,
  onOpenSignIn,
  onOpenSignUp,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenProfile={onOpenProfile}
        onOpenProfileSettings={onOpenProfileSettings}
      />

      {/* Main Content Area */}
      <div className="app-main-viewport">
        {/* Header Bar */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenNewOrder={onOpenNewOrder}
          onOpenNewQuotation={onOpenNewQuotation}
          onOpenNewExpense={onOpenNewExpense}
          onOpenProfile={onOpenProfile}
          onOpenProfileSettings={onOpenProfileSettings}
          onOpenSignIn={onOpenSignIn}
          onOpenSignUp={onOpenSignUp}
        />

        {/* Scrollable Page Viewport */}
        <main className="app-content-body">
          {children}
        </main>
      </div>
    </div>
  );
}
