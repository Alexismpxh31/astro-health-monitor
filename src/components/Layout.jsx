import { NavLink, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { logout, ROLE, useSession } from '../auth/session.js'
import { disconnect as disconnectHeartRate } from '../bluetooth/heartRate.js'
import { stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import { clearCurrentMission } from '../pages/missions/missionStore.js'
import BrandMark from './BrandMark.jsx'
import ConnectionStatus from './ConnectionStatus.jsx'
import Icon from './icons.jsx'
import InsecureContextWarning from './InsecureContextWarning.jsx'
import ThemeToggle from './ThemeToggle.jsx'

// `show(session)`: who sees the link (default: everyone with a session).
const isAstronautView = (session) => session.roleCode !== ROLE.FLIGHT_SURGEON
const isFlightSurgeon = (session) => session.roleCode === ROLE.FLIGHT_SURGEON
const canViewCrew = (session) => isFlightSurgeon(session) || Boolean(session.isMedicalOfficer)

// Menu per role. Everyone has a home ("/": the astronaut dashboard, or the control
// center for the flight surgeon). The astronaut self-care screens are hidden from the
// surgeon because they would store data as if the surgeon were an astronaut.
const NAV_ITEMS = [
  { to: '/', labelKey: 'pages.home', icon: 'home', end: true },
  { to: '/vitals', labelKey: 'pages.vitals', icon: 'vitals', show: isAstronautView },
  { to: '/alerts', labelKey: 'pages.alerts', icon: 'bell', show: isAstronautView },
  { to: '/checkin', labelKey: 'pages.checkin', icon: 'checkin', show: isAstronautView },
  { to: '/missions', labelKey: 'pages.missions', icon: 'missions', show: isFlightSurgeon },
  { to: '/crew', labelKey: 'pages.crew', icon: 'crew', show: canViewCrew },
  { to: '/sensors', labelKey: 'pages.sensors', icon: 'sensors' },
  { to: '/comms', labelKey: 'pages.comms', icon: 'comms', show: isAstronautView },
]

// App shell: side navigation (bottom bar on phones) + top bar (title, connection,
// theme, language, session) + page outlet.
export default function Layout() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const userId = session?.userId
  const user = useLiveQuery(() => (userId ? db.users.get(userId) : undefined), [userId])

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name : ''
  const navItems = session ? NAV_ITEMS.filter((item) => !item.show || item.show(session)) : []

  function handleLogout() {
    // The simulator and the BLE sensor write readings for the session user, so they must not outlive the session.
    stopSimulator()
    disconnectHeartRate()
    // Each login starts at the home screen instead of the mission picked last time.
    clearCurrentMission()
    logout()
  }

  return (
    <div className={`app-shell ${session ? 'has-nav' : 'no-nav'}`}>
      <InsecureContextWarning />
      {session && (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <BrandMark size={44} />
            <span className="sidebar-brand-text">
              <span className="sidebar-brand-name">AstroSalud</span>
              <span className="sidebar-brand-sub">{t('app.team')}</span>
            </span>
          </div>
          <nav className="main-nav" aria-label={t('common.navigation')}>
            {navItems.map(({ to, labelKey, icon, end }) => (
              <NavLink key={to} to={to} end={end} className="nav-link">
                <Icon name={icon} />
                <span className="nav-label">{t(labelKey)}</span>
              </NavLink>
            ))}
          </nav>
          <p className="sidebar-foot">{t('app.event')}</p>
        </aside>
      )}

      <div className="main-col">
        <header className="top-bar">
          <div className="title-block">
            {!session && <BrandMark size={40} />}
            <span className="title-text">
              <span className="app-name">{t('app.name')}</span>
              <span className="app-tagline">{t('app.tagline')}</span>
            </span>
          </div>
          <div className="top-bar-actions">
            <ConnectionStatus />
            <ThemeToggle />
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
            {session && (
              <div className="session-box">
                <span className="session-avatar" aria-hidden="true">
                  <Icon name="user" size={20} />
                </span>
                <span className="session-user" aria-label={t('auth.signedInAs')}>
                  <span className="session-name">{userName}</span>
                  {session.roleCode && (
                    <span className="session-role">{t(`auth.roles.${session.roleCode}`, session.roleCode)}</span>
                  )}
                </span>
                <button type="button" className="icon-button" onClick={handleLogout} aria-label={t('auth.logout')} title={t('auth.logout')}>
                  <Icon name="logout" size={20} />
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
