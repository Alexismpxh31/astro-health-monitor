import { useTranslation } from 'react-i18next'
import { useLiveDemo } from './useLiveDemo.js'
import './LiveDemoToggle.css'

// On/off button for the simulated live feed (demo only).
export default function LiveDemoToggle() {
  const { t } = useTranslation()
  const { isLive, toggle } = useLiveDemo()

  return (
    <button type="button" className="live-demo-toggle" aria-pressed={isLive} onClick={toggle}>
      <span className="live-demo-dot" aria-hidden="true" />
      {isLive ? t('crew.liveOn') : t('crew.liveOff')}
    </button>
  )
}
