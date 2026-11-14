import { useTranslation } from 'react-i18next'
import Icon from '../../components/icons.jsx'
import TrafficLight from '../../components/TrafficLight.jsx'
import ModelStage from '../home/ModelStage.jsx'
import { severityOf } from './crewStatus.js'
import { localName } from './display.js'

/**
 * Body view of one crew member for the flight surgeon: the 3D stage (same component
 * as the astronaut home, so Walter's model shows up here too) and the body systems
 * with their traffic light. Picking a system filters the indicator cards below.
 *
 * @param {Object} props
 * @param {Object[]} props.items - Indicator items from loadMemberData (each has `system` and `level`).
 * @param {string} props.lang
 * @param {string|null} props.selectedCode - Selected body system code, or null for all.
 * @param {(code: string|null) => void} props.onSelect
 */
export default function BodyView({ items, lang, selectedCode, onSelect }) {
  const { t } = useTranslation()

  // One row per body system that has readings, with its worst level.
  const systems = []
  for (const item of items) {
    if (!item.system) continue
    let row = systems.find((entry) => entry.system.id === item.system.id)
    if (!row) {
      row = { system: item.system, level: item.level }
      systems.push(row)
    } else if (severityOf(item.level) > severityOf(row.level)) {
      row.level = item.level
    }
  }
  systems.sort((a, b) => severityOf(b.level) - severityOf(a.level))
  const levels = Object.fromEntries(systems.map((row) => [row.system.code, row.level]))
  const selected = systems.find((row) => row.system.code === selectedCode) ?? null

  // One line per system for the 3D HUD: the indicator behind the system's level.
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const details = Object.fromEntries(
    systems.map((row) => {
      const item = items.find((entry) => entry.system?.id === row.system.id && entry.level === row.level)
      return [
        row.system.code,
        item ? `${localName(item.indicator, lang)} · ${numberFormat.format(item.latest.value)} ${item.unit}` : null,
      ]
    }),
  )

  if (systems.length === 0) return null

  return (
    <section className="body-view glass" aria-labelledby="body-view-title">
      <ModelStage selectedSystem={selectedCode} levels={levels} details={details} onSelectSystem={onSelect} height="480px" />

      <div className="body-view-side">
        <h2 id="body-view-title" className="card-title">{t('bodyView.title')}</h2>
        <p className="muted body-view-hint">{t('bodyView.hint')}</p>
        <ul className="system-list">
          {systems.map((row) => {
            const isSelected = row.system.code === selectedCode
            return (
              <li key={row.system.id}>
                <button
                  type="button"
                  className={`system-row${isSelected ? ' is-selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : row.system.code)}
                >
                  <span className="system-icon"><Icon name={row.system.code} /></span>
                  <span className="system-name">{localName(row.system, lang)}</span>
                  <TrafficLight level={row.level} />
                </button>
              </li>
            )
          })}
        </ul>

        {selected && (
          <div className="body-view-facts">
            <dl className="clinical-facts">
              <div>
                <dt>{t('home.hazard')}</dt>
                <dd>{t(`home.systems.${selected.system.code}.hazard`)}</dd>
              </div>
              <div>
                <dt>{t('home.risk')}</dt>
                <dd>{t(`home.systems.${selected.system.code}.risk`)}</dd>
              </div>
            </dl>
            <button type="button" onClick={() => onSelect(null)}>
              {t('bodyView.showAll')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
