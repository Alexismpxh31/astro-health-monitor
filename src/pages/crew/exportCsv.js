// CSV export of a crew member's readings (flight surgeon panel). Runs fully offline.

const COLUMNS = ['measured_at', 'indicator_code', 'value', 'unit', 'source', 'level']

function escapeCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * @param {Array<{ measuredAt: string, indicatorCode: string, value: number, unit: string, source: string, level: string }>} rows
 * @returns {string} CSV text with a header row.
 */
export function readingsToCsv(rows) {
  const lines = rows.map((row) =>
    [row.measuredAt, row.indicatorCode, row.value, row.unit, row.source, row.level].map(escapeCell).join(','),
  )
  return [COLUMNS.join(','), ...lines].join('\r\n')
}

/** Builds a safe file name like "mei-lin_2026-11-14.csv". */
export function csvFileName(personName, date = new Date()) {
  const slug = personName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'crew-member'}_${date.toISOString().slice(0, 10)}.csv`
}

/** Triggers a browser download. The BOM makes Excel open accents correctly. */
export function downloadCsv(fileName, csv) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
