import { useTranslation } from 'react-i18next'
import { httpsUrl, isSecureContext } from '../utils/secureContext.js'

// Visible warning when the page was opened over http:// (anything but localhost).
// Icon + text, never colour alone.
export default function InsecureContextWarning() {
  const { t } = useTranslation()
  if (isSecureContext()) return null

  return (
    <div className="insecure-warning" role="alert">
      <span className="insecure-warning-icon" aria-hidden="true">
        ⚠
      </span>
      <p>
        <strong>{t('security.insecureTitle')}</strong> {t('security.insecureBody')}{' '}
        <a href={httpsUrl()}>{t('security.openHttps')}</a>
      </p>
    </div>
  )
}
