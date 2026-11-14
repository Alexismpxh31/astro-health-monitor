import { useTranslation } from 'react-i18next'

/**
 * Center stage of the home dashboard.
 *
 * TODO(Walter): replace the placeholder figure with the 3D astronaut model.
 * Props you can use:
 *   - selectedSystem: body system code shown in the clinical card
 *     ('cardiovascular' | 'musculoskeletal' | 'immune' | 'behavioral' | 'radiation')
 *   - levels: { [systemCode]: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'NO_DATA' } to color body zones
 *   - onSelectSystem(code): call it when a body zone is clicked
 *
 * @param {{ selectedSystem: string|null, levels: Record<string, string>, onSelectSystem: (code: string) => void }} props
 */
// eslint-disable-next-line no-unused-vars -- props are the contract for the 3D model
export default function ModelStage({ selectedSystem, levels, onSelectSystem }) {
  const { t } = useTranslation()

  return (
    <div className="model-stage">
      <div className="model-halo" aria-hidden="true" />
      <svg className="model-figure" viewBox="0 0 120 220" aria-hidden="true">
        <circle cx="60" cy="34" r="24" />
        <rect x="40" y="26" width="40" height="18" rx="9" className="model-visor" />
        <path d="M30 70q30-14 60 0l6 70q-36 10-72 0z" />
        <path d="M30 74 12 128l10 4 18-44z" />
        <path d="M90 74l18 54-10 4-18-44z" />
        <path d="M38 146h18l-2 62H40z" />
        <path d="M64 146h18l-2 62H66z" />
      </svg>
      <div className="model-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="model-caption">
        <strong>{t('home.modelSoon')}</strong>
        <span>{t('home.modelHint')}</span>
      </p>
    </div>
  )
}
