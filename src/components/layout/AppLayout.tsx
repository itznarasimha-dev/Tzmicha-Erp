import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-x-hidden overflow-y-auto flex bg-[#f7f9fc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative selection:bg-indigo-600 selection:text-white">
      {/* Light Ambient Mesh Gradient, 3D Floating Geometry & Grid Background */}
      <div className="mesh-gradient-bg pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="mesh-orb-1" />
        <div className="mesh-orb-2" />
        <div className="mesh-orb-3" />
        <div className="grid-overlay" />

        {/* 3D Floating Glass Torus (Top-Right) */}
        <div className="hidden sm:block absolute top-[8%] right-[4%] w-48 h-48 float-3d-1 opacity-70 dark:opacity-40">
          <div className="w-full h-full glass-torus" />
        </div>

        {/* 3D Floating Glass Sphere (Mid-Left) */}
        <div className="hidden sm:block absolute top-[38%] left-[-40px] w-56 h-56 float-3d-2 opacity-65 dark:opacity-30">
          <div className="w-full h-full glass-sphere" />
        </div>

        {/* 3D Floating Octahedron / Prism (Bottom-Right) */}
        <div className="hidden sm:block absolute bottom-[10%] right-[10%] w-40 h-40 float-3d-3 opacity-60 dark:opacity-35">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <defs>
              <linearGradient id="prismGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="prismGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <polygon points="50,5 90,45 50,85 10,45" fill="url(#prismGrad1)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            <polygon points="50,5 50,85 90,45" fill="url(#prismGrad2)" opacity="0.6" />
            <line x1="10" y1="45" x2="90" y2="45" stroke="rgba(255,255,255,0.9)" strokeWidth="1" strokeDasharray="2,2" />
          </svg>
        </div>

        {/* 3D Floating Frosted Isometric Capsule (Mid-Bottom Center) */}
        <div className="hidden sm:block absolute bottom-[2%] left-[30%] w-44 h-24 float-3d-4 opacity-50 dark:opacity-20 rotate-12">
          <div className="w-full h-full rounded-full bg-gradient-to-r from-lime-300/30 via-emerald-400/20 to-sky-400/30 backdrop-blur-md border border-white/60 shadow-xl" />
        </div>
      </div>

      {/* Left Sidebar (Fixed Viewport Height, Self-contained Nav Scroll) */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        {/* Fixed Header */}
        <Header
          onToggleMobile={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          collapsed={collapsed}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Scrollable Main Viewport with Strict X-Axis Containment and Smooth Y-Axis Scrolling */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 pb-20">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
