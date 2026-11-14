// Health data simulator.
// Generates plausible readings for demo purposes when no dataset or BLE sensor is used.
// Every reading is built with createReading() (source: 'simulated'), stored in
// db.readings and then passed to the rules engine.
//
// Merged version: the core engine comes from main (scenarios + rules engine), and the
// bottom of the file adds the live API used by the 3D model UI (simulator.subscribe,
// simulator.state, simulator.history, simulator.triggerAnomaly, startSimulator...).

import catalogs from './seed/catalogs.json'
import { db } from '../db/db.js'
import { createReading } from '../models/reading.js'
import { evaluateReading } from '../rules/engine.js'

const FAST_INTERVAL_MS = 2000 // vital signs
const SLOW_INTERVAL_MS = 20000 // one accelerated "mission day"
const TRANSITION_MS = 25000 // time a scenario takes to reach its target values

const RAD_DOSE_START = 120 // mSv accumulated before the simulation starts

/** Unit symbol of an indicator, taken from the seed catalog (single source of truth). */
function unitOf(code) {
  const indicator = catalogs.indicators.find((row) => row.code === code)
  const unit = indicator && catalogs.units.find((row) => row.id === indicator.unitId)
  if (!unit) throw new Error(`[simulator] Unknown indicator or unit in catalogs.json: ${code}`)
  return unit.symbol
}

// Baseline ("normal") center and noise amplitude per indicator (codes as in catalogs.json).
// `decimals` is the rounding applied to the stored value.
const INDICATORS = {
  HR: { base: 70, noise: 8, decimals: 0, speed: 'fast' },
  SPO2: { base: 97.5, noise: 1, decimals: 1, speed: 'fast', max: 100 },
  SBP: { base: 115, noise: 8, decimals: 0, speed: 'fast' },
  DBP: { base: 75, noise: 5, decimals: 0, speed: 'fast' },
  RR: { base: 15, noise: 2, decimals: 0, speed: 'fast' },
  TSKIN: { base: 36.5, noise: 0.3, decimals: 1, speed: 'fast' },
  RAD_D: { base: 0.5, noise: 0.1, decimals: 1, speed: 'fast', min: 0 },
  BMD: { base: -0.8, noise: 0.2, decimals: 1, speed: 'slow' },
  MUSCLE: { base: 97, noise: 2, decimals: 1, speed: 'slow' },
  PVT: { base: 240, noise: 30, decimals: 0, speed: 'slow' },
  SLEEP_H: { base: 7.5, noise: 0.8, decimals: 1, speed: 'slow', min: 0 },
  WBC: { base: 6.5, noise: 1, decimals: 1, speed: 'slow', min: 0 },
  IL6: { base: 2.5, noise: 0.8, decimals: 1, speed: 'slow', min: 0 },
  CORTISOL: { base: 14, noise: 4, decimals: 1, speed: 'slow', min: 0 },
}

// RAD_DOSE (cumulative mission dose) is not a random walk: it accumulates RAD_D once per simulated day.
const RAD_DOSE = { decimals: 1 }

const FAST_CODES = Object.keys(INDICATORS).filter((code) => INDICATORS[code].speed === 'fast')
const SLOW_CODES = Object.keys(INDICATORS).filter((code) => INDICATORS[code].speed === 'slow')

// Demo scenarios: indicator code -> target center. Anything not listed stays at its baseline.
const SCENARIO_TARGETS = {
  normal: {},
  solarStorm: { RAD_D: 2.5 },
  hypoxia: { SPO2: 88, HR: 110 },
  tachycardia: { HR: 138 },
  boneLoss: { BMD: -1.8 },
  sleepDeprivation: { SLEEP_H: 4, PVT: 420, CORTISOL: 35 },
  infection: { TSKIN: 38.6, WBC: 14, IL6: 10 },
}

/** Scenario names accepted by setScenario(). */
export const SCENARIOS = Object.keys(SCENARIO_TARGETS)

// ---------- Module state (kept across stop/start so charts stay continuous) ----------

let userId = null
let fastTimer = null
let slowTimer = null
let scenario = 'normal'
let radCumulative = RAD_DOSE_START

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
async function emit(indicatorCode, value) {
  recordLive(indicatorCode, value)
  try {
    const unit = unitOf(indicatorCode)
    const reading = createReading({ userId, indicatorCode, value, unit, source: 'simulated' })
    await db.readings.add(reading)
    await evaluateReading(reading)
  } catch (error) {
    console.error('[simulator] Could not store or evaluate reading', indicatorCode, error)
  }
}

function tick(codes) {
  const now = Date.now()
  for (const code of codes) {
    const { decimals } = INDICATORS[code]
    emit(code, round(nextValue(code, now), decimals))
  }
}

function fastTick() {
  tick(FAST_CODES)
  notify()
}

function slowTick() {
  tick(SLOW_CODES)
  // One simulated day has passed: add today's dose to the cumulative dose.
  radCumulative += centerOf('RAD_D', Date.now()) + state.RAD_D.offset
  emit('RAD_DOSE', round(radCumulative, RAD_DOSE.decimals))
  notify()
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
 * @param {'normal'|'solarStorm'|'hypoxia'|'tachycardia'|'boneLoss'|'sleepDeprivation'|'infection'} name
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

// ---------- Live API for the UI (3D body model and live charts) ----------
// Keeps the last value of every indicator and a short rolling history in memory,
// and notifies subscribers after every tick. Key names match the 3D model UI.

const DEFAULT_USER_ID = '00000000-0000-4000-8000-000000000901'
const HISTORY_CODES = ['HR', 'SPO2', 'TSKIN', 'RR', 'RAD_D', 'SBP']
const HISTORY_LENGTH = 25

const latest = { RAD_DOSE: RAD_DOSE_START }
const liveHistory = Object.fromEntries(HISTORY_CODES.map((code) => [code, []]))
const subscribers = new Set()

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Pre-populate the history with baseline values so charts are not empty on first render.
{
  const now = Date.now()
  for (let i = 20; i >= 0; i--) {
    const time = timeLabel(new Date(now - i * FAST_INTERVAL_MS))
    for (const code of HISTORY_CODES) {
      liveHistory[code].push({ time, value: INDICATORS[code].base })
    }
  }
}

function recordLive(code, value) {
  latest[code] = value
  const series = liveHistory[code]
  if (series) {
    series.push({ time: timeLabel(), value })
    if (series.length > HISTORY_LENGTH) series.shift()
  }
}

function valueOf(code) {
  return latest[code] ?? INDICATORS[code]?.base
}

/** Current values with the key names used by the 3D model UI. */
function snapshot() {
  return {
    HR: valueOf('HR'),
    SPO2: valueOf('SPO2'),
    SBP: valueOf('SBP'),
    DBP: valueOf('DBP'),
    RR: valueOf('RR'),
    TSKIN: valueOf('TSKIN'),
    BMD: valueOf('BMD'),
    MUSCLE_MASS: valueOf('MUSCLE'),
    RAD_DAILY: valueOf('RAD_D'),
    RAD_CUMULATIVE: latest.RAD_DOSE,
    PVT: valueOf('PVT'),
    SLEEP_HOURS: valueOf('SLEEP_H'),
    WBC: valueOf('WBC'),
    IL6: valueOf('IL6'),
    CORTISOL: valueOf('CORTISOL'),
  }
}

/** Rolling history with the key names used by the 3D model UI. */
function historySnapshot() {
  return {
    HR: [...liveHistory.HR],
    SPO2: [...liveHistory.SPO2],
    TSKIN: [...liveHistory.TSKIN],
    RR: [...liveHistory.RR],
    RAD_DAILY: [...liveHistory.RAD_D],
    SBP: [...liveHistory.SBP],
  }
}

function notify() {
  const current = snapshot()
  const hist = historySnapshot()
  for (const callback of subscribers) {
    try {
      callback(current, hist)
    } catch (error) {
      console.error('[simulator] Subscriber failed', error)
    }
  }
}

// Demo buttons in the UI -> gradual scenarios of the core engine.
const ANOMALY_TO_SCENARIO = {
  hypoxia: 'hypoxia',
  tachycardia: 'tachycardia',
  radiation: 'solarStorm',
  solarStorm: 'solarStorm',
  boneLoss: 'boneLoss',
  sleepDeprivation: 'sleepDeprivation',
  infection: 'infection',
  reset: 'normal',
  normal: 'normal',
}

/**
 * Object API used by the 3D model UI.
 * simulator.start() accepts a user id (string); any other argument (e.g. an interval in ms)
 * is ignored and the demo astronaut is used.
 */
export const simulator = {
  get state() {
    return snapshot()
  },
  get history() {
    return historySnapshot()
  },
  get isRunning() {
    return isRunning()
  },
  subscribe(callback) {
    subscribers.add(callback)
    callback(snapshot(), historySnapshot())
    return () => {
      subscribers.delete(callback)
    }
  },
  start(forUserId) {
    if (isRunning()) return
    start(typeof forUserId === 'string' && forUserId ? forUserId : DEFAULT_USER_ID)
  },
  stop() {
    stop()
  },
  triggerAnomaly(type) {
    const name = ANOMALY_TO_SCENARIO[type]
    if (!name) {
      console.warn('[simulator] Unknown anomaly type:', type)
      return
    }
    setScenario(name)
    notify()
  },
}

// ---------- Team stub compatibility ----------

/** Builds (without storing) a reading with the latest simulated value of an indicator. */
export function generateReading(forUserId, indicatorCode) {
  let unit
  try {
    unit = unitOf(indicatorCode)
  } catch {
    unit = ''
  }
  return createReading({
    userId: forUserId,
    indicatorCode,
    value: valueOf(indicatorCode) ?? 0,
    unit,
    source: 'simulated',
  })
}

/**
 * Starts the simulator and calls options.onReading with a reading of
 * options.indicatorCodes[0] (default 'HR') after every tick.
 * @returns {() => void} cleanup function that unsubscribes and stops the simulator.
 */
export function startSimulator(options = {}) {
  const forUserId = options.userId || DEFAULT_USER_ID
  if (!isRunning()) start(forUserId)
  const unsubscribe = simulator.subscribe(() => {
    if (options.onReading) {
      const code = options.indicatorCodes?.[0] || 'HR'
      options.onReading(generateReading(forUserId, code))
    }
  })
  return () => {
    unsubscribe()
    stop()
  }
}