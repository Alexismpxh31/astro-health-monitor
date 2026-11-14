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

// 12 points cover the 10 readings the personal baseline needs (src/rules/baseline.js).
const HISTORY_POINTS = 12
const HISTORY_STEP_MS = 5 * 60 * 1000
const RELATIVE_NOISE = 0.015
// Skin temperature is judged against the person's own baseline (±0.7 °C), so its noise must stay small.
const NOISE_OVERRIDES = { TSKIN: 0.004 }
const DECIMALS = { TSKIN: 1 }

function simulateValue(code, baseline) {
  const relativeNoise = NOISE_OVERRIDES[code] ?? RELATIVE_NOISE
  const noisy = baseline + (Math.random() * 2 - 1) * relativeNoise * baseline
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

// ---------- Live mode ----------
// Each value drifts back toward its baseline with noise. Now and then a crew member
// gets a temporary "event" that moves one indicator to a new target for a few ticks
// (some push it out of range, some bring it back to normal), so traffic lights
// change during the demo. Invented dynamics, not physiology.

const DRIFT = 0.35
const EVENT_CHANCE_PER_TICK = 0.08
const EVENT_TICKS = { min: 5, max: 10 }
const DEMO_EVENTS = [
  { indicatorCode: 'HR', target: 108 },
  { indicatorCode: 'HR', target: 138 },
  { indicatorCode: 'HR', target: 72 },
  { indicatorCode: 'SPO2', target: 92 },
  { indicatorCode: 'SPO2', target: 87 },
  { indicatorCode: 'SPO2', target: 97 },
  { indicatorCode: 'SBP', target: 140 },
  // Relative event: skin temperature rises above that person's usual value (fever-like).
  { indicatorCode: 'TSKIN', delta: 2.4 },
]

/** userId -> { values: { [code]: number }, event: { indicatorCode, target?, delta?, ticksLeft } | null } */
const liveState = new Map()

function nextLiveValues(userId, baselines) {
  let state = liveState.get(userId)
  if (!state) {
    state = { values: { ...baselines }, event: null }
    liveState.set(userId, state)
  }

  if (!state.event && Math.random() < EVENT_CHANCE_PER_TICK) {
    const event = DEMO_EVENTS[Math.floor(Math.random() * DEMO_EVENTS.length)]
    const span = EVENT_TICKS.max - EVENT_TICKS.min
    state.event = { ...event, ticksLeft: EVENT_TICKS.min + Math.floor(Math.random() * (span + 1)) }
  }

  for (const [code, baseline] of Object.entries(baselines)) {
    const event = state.event?.indicatorCode === code ? state.event : null
    const target = event ? (event.target ?? baseline + event.delta) : baseline
    const current = state.values[code]
    const drifted = current + (target - current) * DRIFT
    state.values[code] = simulateValue(code, drifted)
  }

  if (state.event) {
    state.event.ticksLeft -= 1
    if (state.event.ticksLeft <= 0) state.event = null
  }
  return state.values
}

/**
 * Adds one live-mode reading per indicator for every demo crew member.
 * Call it on a timer (see the Crew page).
 *
 * @returns {Promise<void>}
 */
export async function addLiveDemoReadings() {
  await ensureDemoCrew()
  const unitByCode = await getUnitByIndicatorCode()
  const measuredAt = new Date().toISOString()

  const readings = Object.entries(demoCrew.baselines).flatMap(([userId, baselines]) =>
    Object.entries(nextLiveValues(userId, baselines)).map(([indicatorCode, value]) => ({
      ...createReading({
        userId,
        indicatorCode,
        value: Math.max(0, Math.min(value, indicatorCode === 'SPO2' ? 100 : Infinity)),
        unit: unitByCode.get(indicatorCode) ?? '',
        source: 'simulated',
      }),
      measuredAt,
    })),
  )
  await db.readings.bulkAdd(readings)
}
