import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import ConnectionStatus from './ConnectionStatus.jsx'

const NAV_ITEMS = [
  { to: '/', labelKey: 'pages.home', end: true },
  { to: '/vitals', labelKey: 'pages.vitals' },
  { to: '/alerts', labelKey: 'pages.alerts' },
  { to: '/checkin', labelKey: 'pages.checkin' },
  { to: '/sensors', labelKey: 'pages.sensors' },
  { to: '/comms', labelKey: 'pages.comms' },
  { to: '/crew', labelKey: 'pages.crew' },
]

// App shell: top bar (app name, connection status, language) + navigation + page outlet.
export default function Layout() {
  const { t, i18n } = useTranslation()

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
        </div>
      </header>

      <nav className="main-nav" aria-label={t('common.navigation')}>
        {NAV_ITEMS.map(({ to, labelKey, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
