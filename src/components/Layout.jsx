import { NavLink, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { logout, ROLE, useSession } from '../auth/session.js'
import { stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import BrandMark from './BrandMark.jsx'
import ConnectionStatus from './ConnectionStatus.jsx'
import Icon from './icons.jsx'
import ThemeToggle from './ThemeToggle.jsx'

// `roleCode`: the link is only shown to users with that role
// (`allowMedicalOfficer`: and to the crew medical officer).
const NAV_ITEMS = [
  { to: '/', labelKey: 'pages.home', icon: 'home', end: true },
  { to: '/vitals', labelKey: 'pages.vitals', icon: 'vitals' },
  { to: '/alerts', labelKey: 'pages.alerts', icon: 'bell' },
  { to: '/checkin', labelKey: 'pages.checkin', icon: 'checkin' },
  { to: '/sensors', labelKey: 'pages.sensors', icon: 'sensors' },
  { to: '/comms', labelKey: 'pages.comms', icon: 'comms' },
  { to: '/crew', labelKey: 'pages.crew', icon: 'crew', roleCode: ROLE.FLIGHT_SURGEON, allowMedicalOfficer: true },
]

// App shell: side navigation (bottom bar on phones) + top bar (title, connection,
// theme, language, session) + page outlet.
export default function Layout() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const userId = session?.userId
  const user = useLiveQuery(() => (userId ? db.users.get(userId) : undefined), [userId])

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name : ''
  const navItems = NAV_ITEMS.filter(
    (item) =>
      !item.roleCode ||
      item.roleCode === session?.roleCode ||
      (item.allowMedicalOfficer && session?.isMedicalOfficer),
  )

  function handleLogout() {
    // The simulator writes readings for the session user, so it must not outlive the session.
    stopSimulator()
    logout()
  }

  return (
    <div className={`app-shell ${session ? 'has-nav' : 'no-nav'}`}>
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
