import { useTranslation } from 'react-i18next'
import './TrafficLight.css'

const ICONS = { NORMAL: '✓', WARNING: '!', CRITICAL: '✕', NO_DATA: '–' }

/**
 * Status badge: colored icon + text, so the level never depends on color alone.
 *
 * @param {Object} props
 * @param {'NORMAL'|'WARNING'|'CRITICAL'|'NO_DATA'} props.level
 */
export default function TrafficLight({ level }) {
  const { t } = useTranslation()
  const safeLevel = ICONS[level] ? level : 'NO_DATA'

  return (
    <span className={`traffic-light is-${safeLevel.toLowerCase().replace('_', '-')}`}>
      <span className="traffic-light-icon" aria-hidden="true">
        {ICONS[safeLevel]}
      </span>
      {t(`trafficLight.${safeLevel}`)}
    </span>
  )
}
