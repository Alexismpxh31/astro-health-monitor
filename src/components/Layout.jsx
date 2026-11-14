import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Orbit, 
  Activity, 
  Bell, 
  ClipboardCheck, 
  Radio, 
  Wifi, 
  Users, 
  UserCheck 
} from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import ConnectionStatus from './ConnectionStatus.jsx'

const NAV_ITEMS = [
  { to: '/', labelKey: 'pages.home', end: true, icon: Orbit },
  { to: '/vitals', labelKey: 'pages.vitals', icon: Activity },
  { to: '/alerts', labelKey: 'pages.alerts', icon: Bell },
  { to: '/checkin', labelKey: 'pages.checkin', icon: ClipboardCheck },
  { to: '/sensors', labelKey: 'pages.sensors', icon: Radio },
  { to: '/comms', labelKey: 'pages.comms', icon: Wifi },
  { to: '/crew', labelKey: 'pages.crew', icon: Users },
]

export default function Layout() {
  const { t, i18n } = useTranslation()

  return (
    <div className="app-shell">
      {/* Flight Control Top Bar */}
      <header className="top-bar">
        <div className="app-branding">
          <span className="app-badge-artemis">NASA HRP</span>
          <div className="app-name">
            <Orbit size={20} className="text-cyan-400" />
            <span>Astro Health Monitor</span>
          </div>
        </div>

        <div className="top-bar-actions">
          {/* Active Astronaut Identity Badge */}
          <div className="crew-indicator" title="Monitoreo biométrico del tripulante en tiempo real">
            <UserCheck size={14} className="text-cyan-400" />
            <span>CDR <strong>WALTER</strong> (EVA-04)</span>
          </div>

          {/* Dexie / Supabase Sync Status */}
          <ConnectionStatus />

          {/* Bilingual Switcher */}
          <div className="lang-switch" role="group" aria-label={t('common.language')}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                className="lang-button"
                aria-pressed={i18n.resolvedLanguage === lang}
                onClick={() => i18n.changeLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Flight Deck Navigation Bar */}
      <nav className="main-nav" aria-label={t('common.navigation')}>
        {NAV_ITEMS.map(({ to, labelKey, end, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            <Icon size={16} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main Mission Content Outlet */}
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
