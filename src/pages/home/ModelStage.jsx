import { lazy, Suspense } from 'react'
import { useTheme } from '../../theme/theme.js'

const AstronautModel3D = lazy(() => import('../../components/AstronautModel3D.jsx'))

/** Body system code (catalog) -> zone of the 3D suit model. */
const SYSTEM_TO_ZONE = {
  cardiovascular: 'cardio',
  behavioral: 'neuro',
  immune: 'metabolic',
  musculoskeletal: 'musculo',
  radiation: 'radiation',
}

const LEVEL_TO_STATUS = { NORMAL: 'optimal', WARNING: 'warning', CRITICAL: 'critical' }

/**
 * Center stage of the home dashboard and of the crew member body view: the 3D astronaut
 * driven by the catalog's body systems.
 *
 * @param {Object} props
 * @param {string|null} props.selectedSystem - Body system code highlighted on the model.
 * @param {Record<string, string>} [props.levels] - { [systemCode]: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'NO_DATA' }.
 * @param {Record<string, string|null>} [props.details] - One line per system for the HUD (e.g. the reading behind its level).
 * @param {(code: string) => void} [props.onSelectSystem] - Called with the system code when a body zone is clicked.
 * @param {string} [props.height] - CSS height of the stage.
 */
export default function ModelStage({ selectedSystem, levels = {}, details = {}, onSelectSystem, height = '540px' }) {
  const theme = useTheme()

  const zoneStatus = {}
  const zoneDetail = {}
  for (const [code, zone] of Object.entries(SYSTEM_TO_ZONE)) {
    if (LEVEL_TO_STATUS[levels[code]]) zoneStatus[zone] = LEVEL_TO_STATUS[levels[code]]
    if (details[code]) zoneDetail[zone] = details[code]
  }

  return (
    <div className="model-stage">
      <Suspense fallback={<div style={{ height }} aria-busy="true" />}>
        <AstronautModel3D
          theme={theme}
          selectedZone={selectedSystem ? SYSTEM_TO_ZONE[selectedSystem] ?? null : null}
          zoneStatus={zoneStatus}
          zoneDetail={zoneDetail}
          onSelectZone={(zone) => onSelectSystem?.(zone.id)}
          height={height}
        />
      </Suspense>
    </div>
  )
}
