// Health data simulator.
// Generates plausible readings for demo purposes when no dataset or BLE sensor is used.
// Every reading is built with createReading() (source: 'simulated'), stored in
// db.readings and then passed to the rules engine.

import { db } from '../db/db.js'
import { createReading } from '../models/reading.js'
import { evaluateReading } from '../rules/engine.js'

/**
 * @typedef {import('../models/reading.js').Reading} Reading
 */

const FAST_INTERVAL_MS = 2000 // vital signs
const SLOW_INTERVAL_MS = 20000 // one accelerated "mission day"
const TRANSITION_MS = 25000 // time a scenario takes to reach its target values

const RAD_C_START = 120 // mSv accumulated before the simulation starts

// Baseline ("normal") center and noise amplitude per indicator.
// `decimals` is the rounding applied to the stored value.
const INDICATORS = {
  HR: { unit: 'bpm', base: 70, noise: 8, decimals: 0, speed: 'fast' },
  SPO2: { unit: '%', base: 97.5, noise: 1, decimals: 1, speed: 'fast', max: 100 },
  SBP: { unit: 'mmHg', base: 115, noise: 8, decimals: 0, speed: 'fast' },
  DBP: { unit: 'mmHg', base: 75, noise: 5, decimals: 0, speed: 'fast' },
  RR: { unit: 'breaths/min', base: 15, noise: 2, decimals: 0, speed: 'fast' },
  TSKIN: { unit: '°C', base: 36.5, noise: 0.3, decimals: 1, speed: 'fast' },
  RAD_D: { unit: 'mSv/day', base: 0.5, noise: 0.1, decimals: 1, speed: 'fast', min: 0 },
  BMD: { unit: '%/month', base: -0.8, noise: 0.2, decimals: 1, speed: 'slow' },
  MUSCLE: { unit: '% baseline', base: 97, noise: 2, decimals: 1, speed: 'slow' },
  PVT: { unit: 'ms', base: 240, noise: 30, decimals: 0, speed: 'slow' },
  SLEEP: { unit: 'h/24h', base: 7.5, noise: 0.8, decimals: 1, speed: 'slow', min: 0 },
  WBC: { unit: '10³/µL', base: 6.5, noise: 1, decimals: 1, speed: 'slow', min: 0 },
  IL6: { unit: 'pg/mL', base: 2.5, noise: 0.8, decimals: 1, speed: 'slow', min: 0 },
  CORT: { unit: 'nmol/L', base: 14, noise: 4, decimals: 1, speed: 'slow', min: 0 },
}

// RAD_C is not a random walk: it accumulates RAD_D once per simulated day.
const RAD_C = { unit: 'mSv', decimals: 1 }

const FAST_CODES = Object.keys(INDICATORS).filter((code) => INDICATORS[code].speed === 'fast')
const SLOW_CODES = Object.keys(INDICATORS).filter((code) => INDICATORS[code].speed === 'slow')

// Demo scenarios: indicator code -> target center. Anything not listed stays at its baseline.
const SCENARIO_TARGETS = {
  normal: {},
  solarStorm: { RAD_D: 2.5 },
  hypoxia: { SPO2: 88, HR: 110 },
  boneLoss: { BMD: -1.8 },
  sleepDeprivation: { SLEEP: 4, PVT: 420, CORT: 35 },
  infection: { TSKIN: 38.6, WBC: 14, IL6: 10 },
}

/** Scenario names accepted by setScenario(). */
export const SCENARIOS = Object.keys(SCENARIO_TARGETS)

// ---------- Module state (kept across stop/start so charts stay continuous) ----------

let userId = null
let fastTimer = null
let slowTimer = null
let scenario = 'normal'
let radCumulative = RAD_C_START

// Per indicator: the center moves linearly from `from` to `to` starting at
// `startedAt`; `offset` is a small random walk around that center.
const state = Object.fromEntries(
  Object.entries(INDICATORS).map(([code, { base }]) => [
    code,
    { from: base, to: base, startedAt: 0, offset: 0 },
  ]),
)

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, decimals) {
  const factor = 10 ** decimals
  // "+ 0" turns -0 into 0.
  return Math.round(value * factor) / factor + 0
}

/** Current center of an indicator, interpolated while a scenario transition is in progress. */
function centerOf(code, now) {
  const { from, to, startedAt } = state[code]
  const progress = clamp((now - startedAt) / TRANSITION_MS, 0, 1)
  return from + (to - from) * progress
}

/** Next (unrounded) value of an indicator: moving center + smooth random walk. */
function nextValue(code, now) {
  const { noise, min = -Infinity, max = Infinity } = INDICATORS[code]
  const s = state[code]
  // Mean-reverting walk: each step starts from the previous offset, so there are no jumps.
  const step = (Math.random() * 2 - 1) * noise * 0.35
  s.offset = clamp(s.offset * 0.8 + step, -noise, noise)
  return clamp(centerOf(code, now) + s.offset, min, max)
}

/** Stores one reading and runs the rules engine on it. Never throws. */
async function emit(indicatorCode, value, unit) {
  const reading = createReading({ userId, indicatorCode, value, unit, source: 'simulated' })
  try {
    await db.readings.add(reading)
    await evaluateReading(reading)
  } catch (error) {
    console.error('[simulator] Could not store or evaluate reading', indicatorCode, error)
  }
}

function tick(codes) {
  const now = Date.now()
  for (const code of codes) {
    const { unit, decimals } = INDICATORS[code]
    emit(code, round(nextValue(code, now), decimals), unit)
  }
}

function fastTick() {
  tick(FAST_CODES)
}

function slowTick() {
  tick(SLOW_CODES)
  // One simulated day has passed: add today's dose to the cumulative dose.
  radCumulative += centerOf('RAD_D', Date.now()) + state.RAD_D.offset
  emit('RAD_C', round(radCumulative, RAD_C.decimals), RAD_C.unit)
}

// ---------- Public API ----------

/**
 * Starts emitting simulated readings for a user.
 * Fast vital signs every 2 s, slow indicators every 20 s.
 * Calling it while already running switches the simulation to the new user.
 *
 * @param {string} forUserId - UUID of the user the readings belong to.
 */
export function start(forUserId) {
  if (!forUserId) throw new Error('[simulator] start(userId) requires a user id')
  stop()
  userId = forUserId
  // Emit right away so the UI does not wait for the first interval.
  fastTick()
  slowTick()
  fastTimer = setInterval(fastTick, FAST_INTERVAL_MS)
  slowTimer = setInterval(slowTick, SLOW_INTERVAL_MS)
}

/** Stops the simulator. Safe to call when it is not running. */
export function stop() {
  clearInterval(fastTimer)
  clearInterval(slowTimer)
  fastTimer = null
  slowTimer = null
}

/** @returns {boolean} true while readings are being emitted. */
export function isRunning() {
  return fastTimer !== null
}

/** @returns {string} name of the active scenario. */
export function getScenario() {
  return scenario
}

/**
 * Switches the demo scenario. Values drift gradually (~25 s) from where
 * they are now to the targets of the new scenario.
 *
 * @param {'normal'|'solarStorm'|'hypoxia'|'boneLoss'|'sleepDeprivation'|'infection'} name
 */
export function setScenario(name) {
  const targets = SCENARIO_TARGETS[name]
  if (!targets) throw new Error(`[simulator] Unknown scenario: ${name}`)
  const now = Date.now()
  for (const code of Object.keys(INDICATORS)) {
    const s = state[code]
    s.from = centerOf(code, now)
    s.to = targets[code] ?? INDICATORS[code].base
    s.startedAt = now
  }
  scenario = name
}
