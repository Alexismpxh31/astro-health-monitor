import React, { useEffect, useState } from 'react';
import { Activity, Heart, Shield, Wifi, WifiOff } from 'lucide-react';

export const Navbar = ({ currentPath = '/', onNavigate = () => {} }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { id: '/', label: 'Bio-HUD Anatómico', icon: Activity },
    { id: '/vitals', label: 'Signos Vitales en Vivo', icon: Heart },
    { id: '/system/cardiovascular', label: 'Peligros NASA (HRP)', icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-50 bg-space-bg/95 backdrop-blur-md border-b border-space-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-space-cyan/15 border border-space-cyan/40 flex items-center justify-center text-space-cyan group-hover:scale-105 transition-transform shadow-glow-cyan">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono font-bold tracking-wider text-sm sm:text-base text-white flex items-center gap-1.5">
              KAIROS <span className="text-space-cyan">ASTROSALUD</span>
            </span>
            <span className="text-[10px] font-mono text-space-muted block leading-none">
              NASA HUMAN RESEARCH PROGRAM (HRP)
            </span>
          </div>
        </div>

        {/* Right Status Badge & Astronaut ID */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Online/Offline status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono backdrop-blur-sm bg-space-surface border-space-border">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-status-normal" />
                <span className="text-space-muted hidden sm:inline">Enlace Estable (ISS-DTN)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-status-caution animate-pulse" />
                <span className="text-status-caution font-medium">Modo Offline Activo</span>
              </>
            )}
          </div>

          {/* Walter Profile */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-space-surface border border-space-border text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-space-cyan" />
            <span className="text-white font-semibold">Walter C.</span>
            <span className="text-space-muted hidden sm:inline">(KAIROS-2)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="border-t border-space-border/60 bg-space-surface/50 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-2 py-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.id || (item.id.startsWith('/system') && currentPath.startsWith('/system'));
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-mono tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-space-cyan/15 text-space-cyan border border-space-cyan/40 font-semibold shadow-glow-cyan'
                    : 'text-space-muted hover:text-space-text hover:bg-space-card'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
