import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Pizza, Truck, MessageSquare, ShoppingBag, Menu, X } from 'lucide-react';
import CatalogCart from './pages/CatalogCart';
import Tracker from './pages/Tracker';
import AiChat from './pages/AiChat';

export const App: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Menu & Cart', icon: Pizza },
    { to: '/tracker', label: 'Order Tracker', icon: Truck },
    { to: '/chat', label: 'AI Concierge', icon: MessageSquare },
  ];

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0d0e12] text-zinc-100 flex flex-col font-sans">
        {/* Pizza Hut Crimson Red Top Navigation Bar */}
        <header className="sticky top-0 z-50 bg-[#E31837] shadow-xl shadow-red-950/40 border-b border-red-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand Logo & Title */}
              <NavLink to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#E31837] shadow-md group-hover:scale-105 transition-transform">
                  {/* Pizza Hut Iconic Red Roof stylized shape */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-6 h-2 bg-[#E31837] rounded-t-sm" />
                    <div className="w-7 h-1 bg-[#FFA800] mt-0.5 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xl tracking-tight text-white uppercase italic">
                      Pizza Hut
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/30 text-red-100 border border-white/20">
                      Jac
                    </span>
                  </div>
                  <p className="text-[10px] text-red-100/80 -mt-1 font-medium tracking-wide">
                    Hackathon Baseline Monorepo
                  </p>
                </div>
              </NavLink>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-black/30 text-white shadow-inner border border-white/20'
                            : 'text-red-100 hover:text-white hover:bg-black/15'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              {/* Right Side: Status Badge */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/25 border border-white/10 text-xs font-mono text-red-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Jac Scale :8000</span>
                </div>
                <NavLink
                  to="/"
                  className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors relative"
                  title="Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[10px] font-black rounded-full flex items-center justify-center">
                    0
                  </span>
                </NavLink>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg bg-black/20 text-white hover:bg-black/30 focus:outline-none"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-red-800 border-t border-red-700 px-4 pt-2 pb-4 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                        isActive
                          ? 'bg-black/30 text-white font-bold'
                          : 'text-red-100 hover:bg-black/15'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </header>

        {/* Page Content Shell */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<CatalogCart />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/chat" element={<AiChat />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 bg-zinc-950/80 py-6 mt-12 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-400">Pizza Hut + Jac Monorepo Skeleton</span>
              <span>•</span>
              <span>Ready for Branching</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400">
              <span>Catalog (Dev 1)</span>
              <span>•</span>
              <span>Delivery (Dev 2)</span>
              <span>•</span>
              <span>AI Chat (Dev 3)</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
