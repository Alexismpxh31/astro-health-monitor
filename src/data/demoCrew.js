import { db, seedIfEmpty } from '../db/db.js'
import { createReading } from '../models/reading.js'
import demoCrew from './seed/demoCrew.json'

// Simulated crew for the flight surgeon panel demo.
// Adds three fictional astronauts to the demo mission and gives each one a short
// history of simulated readings (source: 'simulated'). The baselines in
// seed/demoCrew.json are invented so that one member is normal, one is in
// "warning" and one is "critical" against the team thresholds. They are NOT real
// medical data.
// TODO: replace with src/data/simulator.js output once it is implemented.

const HISTORY_POINTS = 6
const HISTORY_STEP_MS = 5 * 60 * 1000
const RELATIVE_NOISE = 0.015
const DECIMALS = { TSKIN: 1 }

function simulateValue(code, baseline) {
  const noisy = baseline + (Math.random() * 2 - 1) * RELATIVE_NOISE * baseline
  const factor = 10 ** (DECIMALS[code] ?? 0)
  return Math.round(noisy * factor) / factor
}

async function getUnitByIndicatorCode() {
  const [indicators, units] = await Promise.all([db.indicators.toArray(), db.units.toArray()])
  const symbolByUnitId = new Map(units.map((unit) => [unit.id, unit.symbol]))
  return new Map(indicators.map((indicator) => [indicator.code, symbolByUnitId.get(indicator.unitId) ?? '']))
}

function buildSnapshot(unitByCode, measuredAt) {
  return Object.entries(demoCrew.baselines).flatMap(([userId, baselines]) =>
    Object.entries(baselines).map(([indicatorCode, baseline]) => ({
      ...createReading({
        userId,
        indicatorCode,
        value: simulateValue(indicatorCode, baseline),
        unit: unitByCode.get(indicatorCode) ?? '',
        source: 'simulated',
      }),
      measuredAt,
    })),
  )
}

async function seedDemoCrew() {
  // The catalogs must exist first; otherwise seedIfEmpty() would see our users and skip them.
  await seedIfEmpty()

  await db.transaction('rw', [db.users, db.crew, db.readings, db.indicators, db.units], async () => {
    await db.users.bulkPut(demoCrew.users)
    await db.crew.bulkPut(demoCrew.crew)

    const demoUserIds = demoCrew.users.map((user) => user.id)
    if ((await db.readings.where('userId').anyOf(demoUserIds).count()) > 0) return

    const unitByCode = await getUnitByIndicatorCode()
    const now = Date.now()
    const history = []
    for (let step = HISTORY_POINTS - 1; step >= 0; step -= 1) {
      const measuredAt = new Date(now - step * HISTORY_STEP_MS).toISOString()
      history.push(...buildSnapshot(unitByCode, measuredAt))
    }
    await db.readings.bulkAdd(history)
  })
}

let ensurePromise = null

/**
 * Makes sure the demo crew and its first simulated readings exist in IndexedDB.
 * Safe to call many times (runs once per page load).
 *
 * @returns {Promise<void>}
 */
export function ensureDemoCrew() {
  ensurePromise ??= seedDemoCrew().catch((error) => {
    ensurePromise = null
    throw error
  })
  return ensurePromise
}

/**
 * Adds one new simulated reading per indicator for every demo crew member.
 *
 * @returns {Promise<void>}
 */
export async function addDemoReadings() {
  await ensureDemoCrew()
  const unitByCode = await getUnitByIndicatorCode()
  await db.readings.bulkAdd(buildSnapshot(unitByCode, new Date().toISOString()))
}
