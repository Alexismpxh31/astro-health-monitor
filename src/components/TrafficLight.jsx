import { useTranslation } from 'react-i18next'
import './TrafficLight.css'

const ICONS = { NORMAL: '✓', WARNING: '!', CRITICAL: '✕', NO_DATA: '–' }

const NORMALIZE_MAP = {
  normal: 'NORMAL',
  NORMAL: 'NORMAL',
  caution: 'WARNING',
  warning: 'WARNING',
  WARNING: 'WARNING',
  critical: 'CRITICAL',
  CRITICAL: 'CRITICAL',
  no_data: 'NO_DATA',
  NO_DATA: 'NO_DATA',
}

export default function TrafficLight({ level, showText = true, size = 'md' }) {
  const { t } = useTranslation()
  const safeLevel = NORMALIZE_MAP[level] || 'NO_DATA'

  return (
    <span className={`traffic-light is-${safeLevel.toLowerCase().replace('_', '-')} size-${size}`}>
      <span className="traffic-light-icon" aria-hidden="true">
        {ICONS[safeLevel]}
      </span>
      {showText && (t(`trafficLight.${safeLevel}`) || safeLevel)}
    </span>
  )
}

export { TrafficLight }
