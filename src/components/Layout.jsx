import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  BarChart2, 
  Settings, 
  HelpCircle, 
  User, 
  ChevronDown 
} from 'lucide-react';
import ConnectionStatus from './ConnectionStatus.jsx';

export default function Layout() {
  const { t, i18n } = useTranslation();

  const NAV_ITEMS = [
    { to: '/', label: 'Inicio', icon: Home, end: true },
    { to: '/vitals', label: 'Reportes', icon: BarChart2 },
    { to: '/sensors', label: 'Configuración', icon: Settings },
    { to: '/alerts', label: 'Ayuda', icon: HelpCircle },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F0F5FA', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Earth Atmosphere Orbital Glow in Top-Right Corner */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '680px',
          height: '340px',
          backgroundImage: 'url(/earth_corner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 1
        }} 
      />

      {/* Left Docking Sidebar (Deep NASA Blue) */}
      <aside 
        style={{
          width: '104px',
          flexShrink: 0,
          background: 'linear-gradient(180deg, #050E24 0%, #071536 50%, #0A1C44 100%)',
          borderRadius: '0 24px 24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 0',
          boxShadow: '4px 0 25px rgba(5, 14, 36, 0.25)',
          zIndex: 20,
          position: 'sticky',
          top: 0,
          height: '100vh'
        }}
      >
        {/* Top: NASA Meatball Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/nasa_meatball.png" 
            alt="NASA Logo" 
            style={{ width: '68px', height: '68px', objectFit: 'contain' }}
            onError={(e) => {
              // Fallback if image path fails
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Center: Navigation Buttons */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '0 12px' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '12px 6px',
                borderRadius: '16px',
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : '#8CA0C0',
                background: isActive ? '#0B57D0' : 'transparent',
                boxShadow: isActive ? '0 4px 16px rgba(11, 87, 208, 0.45)' : 'none',
                transition: 'all 0.15s ease',
                fontSize: '11px',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer'
              })}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Slogan */}
        <div style={{ 
          fontSize: '8.5px', 
          fontFamily: 'sans-serif', 
          color: '#556A8F', 
          textAlign: 'center', 
          letterSpacing: '0.12em',
          lineHeight: '1.4',
          textTransform: 'uppercase',
          fontWeight: '700',
          padding: '0 8px'
        }}>
          NASA<br />
          EXPLORING<br />
          A BRIGHTER<br />
          FUTURE
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 10 }}>
        
        {/* Header Bar */}
        <header 
          style={{
            padding: '24px 36px 12px 36px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Title & Subtitle with vertical blue accent */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div 
              style={{
                width: '4px',
                height: '38px',
                background: '#0284C7',
                borderRadius: '2px',
                marginTop: '3px'
              }} 
            />
            <div>
              <h1 style={{
                fontSize: '26px',
                fontWeight: '800',
                color: '#0E1B3E',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: '1.2'
              }}>
                Astro Health Monitor
              </h1>
              <span style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                letterSpacing: '0.18em',
                color: '#5A6E8C',
                textTransform: 'uppercase',
                fontWeight: '700'
              }}>
                NASA SPACE MEDICAL SYSTEMS
              </span>
            </div>
          </div>

          {/* Right Status Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 10 }}>
            {/* Online Status Pill */}
            <div 
              style={{
                background: 'rgba(3, 11, 30, 0.78)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                padding: '6px 16px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}
            >
              <span 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 10px #22C55E'
                }} 
              />
              <span>En línea</span>
            </div>

            {/* Vertical subtle divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.22)' }} />

            {/* Astronaut Profile Pill */}
            <div 
              style={{
                background: 'rgba(3, 11, 30, 0.78)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                padding: '5px 16px 5px 8px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div 
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <User size={14} className="text-white" />
              </div>
              <span>CDR. WALTER</span>
              <ChevronDown size={14} className="text-slate-300" />
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main style={{ flex: 1, padding: '12px 36px 36px 36px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
