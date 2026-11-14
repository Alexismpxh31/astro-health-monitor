import { db, seedIfEmpty } from '../db/db.js'
import { createReading } from '../models/reading.js'
import { evaluateReading } from '../rules/engine.js'
import demoCrew from './seed/demoCrew.json'

// Simulated vital signs for the flight surgeon panel demo.
// Feeds two of the official demo astronauts from src/data/seed/users.json with a
// short history of simulated readings (source: 'simulated'):
//   - Astronaut Two (…0003): heart rate in "caution"
//   - Astronaut Three (…0004): SpO2 in "critical"
// Astronaut One (…0002) is left to src/data/simulator.js (the /sensors screen),
// so no astronaut gets readings from two simulators at once.
// The baselines in seed/demoCrew.json are invented for the demo: NOT real medical data.

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

function buildSnapshot(unitByCode, measuredAt, userIds = Object.keys(demoCrew.baselines)) {
  return userIds.map((userId) => [userId, demoCrew.baselines[userId]]).flatMap(([userId, baselines]) =>
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

/** Official demo astronauts that receive readings from this module. */
export const DEMO_CREW_USER_IDS = Object.keys(demoCrew.baselines)

/** Runs new readings through the rules engine so they raise alerts like real sensor data. */
async function evaluateAll(readings) {
  for (const reading of readings) await evaluateReading(reading)
}

async function seedDemoCrew() {
  // The users, crew and catalogs come from the team seed (users.json, catalogs.json).
  await seedIfEmpty()

  const latest = await db.transaction('rw', [db.readings, db.indicators, db.units], async () => {
    // Each demo astronaut gets a starting history once (new demo astronauts too).
    const withReadings = new Set(await db.readings.where('userId').anyOf(DEMO_CREW_USER_IDS).uniqueKeys())
    const missing = DEMO_CREW_USER_IDS.filter((userId) => !withReadings.has(userId))
    if (missing.length === 0) return []

    const unitByCode = await getUnitByIndicatorCode()
    const now = Date.now()
    const history = []
    for (let step = HISTORY_POINTS - 1; step >= 0; step -= 1) {
      const measuredAt = new Date(now - step * HISTORY_STEP_MS).toISOString()
      history.push(...buildSnapshot(unitByCode, measuredAt, missing))
    }
    await db.readings.bulkAdd(history)
    const newest = history.at(-1).measuredAt
    return history.filter((reading) => reading.measuredAt === newest)
  })
  // Only the newest snapshot is evaluated, so the history does not flood the alert list.
  await evaluateAll(latest)
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
  const readings = buildSnapshot(unitByCode, new Date().toISOString())
  await db.readings.bulkAdd(readings)
  await evaluateAll(readings)
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
  await evaluateAll(readings)
}
