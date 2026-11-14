import { useTranslation } from 'react-i18next'
import { setTheme, useTheme } from '../theme/theme.js'
import Icon from './icons.jsx'

// Switches between the light and dark palettes.
export default function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useTheme()
  const next = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={t(`theme.switchTo.${next}`)}
      title={t(`theme.switchTo.${next}`)}
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} />
    </button>
  )
}
