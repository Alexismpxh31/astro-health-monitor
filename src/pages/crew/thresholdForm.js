export const THRESHOLD_FIELDS = ['minCritical', 'minNormal', 'maxNormal', 'maxCritical']

/**
 * Parses and validates the four bounds typed by the flight surgeon.
 * Rule (same as the DB CHECK): minCritical <= minNormal <= maxNormal <= maxCritical.
 * An empty field means "no limit on that side".
 *
 * @param {Record<string, string>} form
 * @returns {{ values: Record<string, number|null> } | { errorKey: string }}
 */
export function parseThresholdForm(form) {
  const values = {}
  for (const field of THRESHOLD_FIELDS) {
    const raw = (form[field] ?? '').trim().replace(',', '.')
    if (raw === '') {
      values[field] = null
      continue
    }
    const number = Number(raw)
    if (!Number.isFinite(number)) return { errorKey: 'crewDetail.threshold.errorNumber' }
    values[field] = number
  }

  const filled = THRESHOLD_FIELDS.map((field) => values[field]).filter((value) => value != null)
  if (filled.length === 0) return { errorKey: 'crewDetail.threshold.errorEmpty' }
  if (filled.some((value, index) => index > 0 && value < filled[index - 1])) {
    return { errorKey: 'crewDetail.threshold.errorOrder' }
  }
  return { values }
}
