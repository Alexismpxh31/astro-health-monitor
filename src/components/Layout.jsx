import { NavLink, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { logout, ROLE, useSession } from '../auth/session.js'
import { disconnect as disconnectHeartRate } from '../bluetooth/heartRate.js'
import { stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import ConnectionStatus from './ConnectionStatus.jsx'
import InsecureContextWarning from './InsecureContextWarning.jsx'

// `show(session)`: who sees the link (default: everyone with a session).
const isAstronautView = (session) => session.roleCode !== ROLE.FLIGHT_SURGEON
const canViewCrew = (session) => session.roleCode === ROLE.FLIGHT_SURGEON || Boolean(session.isMedicalOfficer)

// The flight surgeon only gets Crew and Sensors: the other screens are astronaut self-care.
const NAV_ITEMS = [
  { to: '/crew', labelKey: 'pages.crew', show: canViewCrew },
  { to: '/', labelKey: 'pages.home', end: true, show: isAstronautView },
  { to: '/vitals', labelKey: 'pages.vitals', show: isAstronautView },
  { to: '/alerts', labelKey: 'pages.alerts', show: isAstronautView },
  { to: '/checkin', labelKey: 'pages.checkin', show: isAstronautView },
  { to: '/sensors', labelKey: 'pages.sensors' },
  { to: '/comms', labelKey: 'pages.comms', show: isAstronautView },
]

// App shell: top bar (app name, connection status, language, session) + navigation + page outlet.
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
    logout()
  }

  return (
    <div className="app-shell">
      <InsecureContextWarning />
      <header className="top-bar">
        <span className="app-name">{t('app.name')}</span>
        <div className="top-bar-actions">
          <ConnectionStatus />
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
              <span className="session-user" aria-label={t('auth.signedInAs')}>
                <span className="session-name">{userName}</span>
                {session.roleCode && (
                  <span className="session-role">{t(`auth.roles.${session.roleCode}`, session.roleCode)}</span>
                )}
              </span>
              <button type="button" onClick={handleLogout}>
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </header>

      {session && (
        <nav className="main-nav" aria-label={t('common.navigation')}>
          {navItems.map(({ to, labelKey, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
      )}

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
