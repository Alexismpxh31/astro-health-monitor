import { NavLink, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { logout, ROLE, useSession } from '../auth/session.js'
import { stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import ConnectionStatus from './ConnectionStatus.jsx'

// `roleCode`: the link is only shown to users with that role.
const NAV_ITEMS = [
  { to: '/', labelKey: 'pages.home', end: true },
  { to: '/vitals', labelKey: 'pages.vitals' },
  { to: '/alerts', labelKey: 'pages.alerts' },
  { to: '/checkin', labelKey: 'pages.checkin' },
  { to: '/sensors', labelKey: 'pages.sensors' },
  { to: '/comms', labelKey: 'pages.comms' },
  { to: '/crew', labelKey: 'pages.crew', roleCode: ROLE.FLIGHT_SURGEON },
]

// App shell: top bar (app name, connection status, language, session) + navigation + page outlet.
export default function Layout() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const userId = session?.userId
  const user = useLiveQuery(() => (userId ? db.users.get(userId) : undefined), [userId])

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name : ''
  const navItems = NAV_ITEMS.filter((item) => !item.roleCode || item.roleCode === session?.roleCode)

  function handleLogout() {
    // The simulator writes readings for the session user, so it must not outlive the session.
    stopSimulator()
    logout()
  }

  return (
    <div className="app-shell">
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
