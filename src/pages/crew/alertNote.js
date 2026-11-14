import { recommendationText } from '../../rules/engine.js'
import { localName } from './display.js'

/**
 * Note text prefilled from an alert ("I saw your SpO2 alert (87 %) at 15:38. …").
 *
 * @param {(key: string, options?: Object) => string} t - i18next translate function.
 * @param {string} lang - 'es' | 'en'.
 * @param {Object} item - Crew alert item (see loadCrewAlerts).
 * @returns {string}
 */
export function alertNoteDraft(t, lang, item) {
  const numberFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  return t('crewAlerts.draft', {
    indicator: item.indicator ? localName(item.indicator, lang) : item.reading.indicatorCode,
    value: numberFormat.format(item.reading.value),
    unit: item.reading.unit,
    time: timeFormat.format(new Date(item.alert.generatedAt)),
    advice: recommendationText(item.recommendation, item.reading, lang),
  }).trim()
}

/**
 * Router state to open a crew member's detail with a note about this alert.
 * The alert id travels with the note: when the astronaut reads it, the alert is attended.
 */
export function alertNoteState(t, lang, item) {
  return { noteDraft: alertNoteDraft(t, lang, item), alertId: item.alert.id }
}
