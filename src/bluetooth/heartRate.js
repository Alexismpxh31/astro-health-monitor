// Web Bluetooth heart rate monitor.
// Uses the standard GATT Heart Rate service (0x180D) and its Heart Rate
// Measurement characteristic (0x2A37). Every measurement becomes an official
// Reading (source: 'ble') that is stored in IndexedDB FIRST and then passed to
// the rules engine, exactly like the simulator does.
//
// Web Bluetooth only exists in secure contexts (https:// or localhost) and is
// not implemented by Safari or Firefox.

import { useSyncExternalStore } from 'react'
import { defaultUserId } from '../data/demoUser.js'
import { stop as stopSimulator } from '../data/simulator.js'
import { db } from '../db/db.js'
import { createReading } from '../models/reading.js'
import { evaluateReading } from '../rules/engine.js'
import { hasBluetooth, isSecureContext } from '../utils/secureContext.js'

export const HEART_RATE_SERVICE = 0x180d
export const HEART_RATE_MEASUREMENT = 0x2a37

const INDICATOR_CODE = 'HR'
const UNIT = 'bpm'
const RECONNECT_DELAY_MS = 1000

/**
 * @typedef {'disconnected'|'connecting'|'connected'|'reconnecting'} HeartRateStatus
 *
 * @typedef {Object} HeartRateState
 * @property {HeartRateStatus} status
 * @property {string|null} deviceName
 * @property {number|null} lastBpm - Last value received in this connection.
 * @property {'lost'|null} error - 'lost': the sensor dropped and the single retry failed.
 */

/** Error with a stable `code` the UI maps to an i18n message (sensors.ble.errors.<code>). */
export class HeartRateError extends Error {
  /** @param {'insecure'|'unsupported'|'cancelled'|'failed'|'gatt'|'heartRateService'|'notifications'} code */
  constructor(code, cause) {
    super(`[bluetooth] Heart rate sensor: ${code}`, { cause })
    this.name = 'HeartRateError'
    this.code = code
  }
}

// ---------- State store (outside React, survives page changes) ----------

/** @type {HeartRateState} */
let state = { status: 'disconnected', deviceName: null, lastBpm: null, error: null }
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {HeartRateState} */
export function getState() {
  return state
}

/** React hook: the sensor state; re-renders on every change. */
export function useHeartRate() {
  return useSyncExternalStore(subscribe, getState)
}

// ---------- Parsing ----------

/**
 * Reads the heart rate from a Heart Rate Measurement value (0x2A37).
 * Bit 0 of the flags byte tells the format: 0 = uint8, 1 = uint16 (little endian).
 *
 * @param {DataView} view
 * @returns {number|null} beats per minute, or null when the packet is too short.
 */
export function parseHeartRate(view) {
  if (!view || view.byteLength < 2) return null
  const isUint16 = (view.getUint8(0) & 0x01) === 0x01
  if (!isUint16) return view.getUint8(1)
  return view.byteLength >= 3 ? view.getUint16(1, true) : null
}

// ---------- Connection ----------

let device = null
let characteristic = null
let userId = null
let intentionalDisconnect = false

/** @returns {boolean} true when Web Bluetooth can be used here (secure context + browser support). */
export function isSupported() {
  return isSecureContext() && hasBluetooth()
}

/** Stores one measurement and runs the rules engine on it. Never throws. */
async function handleMeasurement(event) {
  const bpm = parseHeartRate(event.target.value)
  // 0 means "no contact" on most sensors: not a real heart rate.
  if (!bpm) return
  setState({ lastBpm: bpm })
  try {
    const reading = createReading({ userId, indicatorCode: INDICATOR_CODE, value: bpm, unit: UNIT, source: 'ble' })
    await db.readings.add(reading)
    await evaluateReading(reading)
  } catch (error) {
    console.error('[bluetooth] Could not store or evaluate the reading', error)
  }
}

/** Opens the GATT connection and starts the heart rate notifications. */
async function openConnection() {
  let stage = 'gatt'
  try {
    const server = await device.gatt.connect()
    stage = 'heartRateService'
    const service = await server.getPrimaryService(HEART_RATE_SERVICE)
    characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
    stage = 'notifications'
    characteristic.addEventListener('characteristicvaluechanged', handleMeasurement)
    await characteristic.startNotifications()
  } catch (error) {
    throw new HeartRateError(stage, error)
  }
}

function releaseDevice() {
  characteristic?.removeEventListener('characteristicvaluechanged', handleMeasurement)
  device?.removeEventListener('gattserverdisconnected', handleDisconnected)
  characteristic = null
  device = null
}

/** Unexpected disconnection: one reconnection attempt, then give up. */
async function handleDisconnected() {
  if (intentionalDisconnect || !device) return
  const lostDevice = device
  characteristic?.removeEventListener('characteristicvaluechanged', handleMeasurement)
  setState({ status: 'reconnecting' })
  try {
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS))
    // The user may have disconnected (or connected another sensor) while waiting.
    if (intentionalDisconnect || device !== lostDevice) return
    await openConnection()
    setState({ status: 'connected', error: null })
  } catch (error) {
    if (intentionalDisconnect || device !== lostDevice) return
    console.error('[bluetooth] Reconnection failed', error)
    releaseDevice()
    setState({ status: 'disconnected', deviceName: null, error: 'lost' })
  }
}

/**
 * Asks the user to pick a BLE heart rate sensor and starts storing its readings.
 * Must be called from a user gesture (click/tap). The simulator is stopped first:
 * simulated and real readings never run at the same time.
 *
 * @param {string} [forUserId] - User the readings belong to. Default: the logged-in
 *   user, or the demo astronaut (see src/data/demoUser.js).
 * @returns {Promise<void>}
 * @throws {HeartRateError} code 'insecure' (not https), 'unsupported' (Safari, Firefox...),
 *   'cancelled' (the user closed the device picker) or 'failed' (could not connect).
 */
export async function connect(forUserId) {
  if (!isSecureContext()) throw new HeartRateError('insecure')
  if (!hasBluetooth()) throw new HeartRateError('unsupported')
  if (state.status !== 'disconnected') return

  stopSimulator()
  intentionalDisconnect = false
  setState({ status: 'connecting', error: null, lastBpm: null })
  try {
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] })
    userId = forUserId || defaultUserId()
    device.addEventListener('gattserverdisconnected', handleDisconnected)
    await openConnection()
    setState({ status: 'connected', deviceName: device.name || null })
  } catch (error) {
    // Closing the device picker rejects with NotFoundError: not a failure.
    const cancelled = !device && error?.name === 'NotFoundError'
    intentionalDisconnect = true
    try {
      device?.gatt?.disconnect()
    } catch {
      // Already disconnected.
    }
    releaseDevice()
    setState({ status: 'disconnected', deviceName: null })
    if (error instanceof HeartRateError) throw error
    throw new HeartRateError(cancelled ? 'cancelled' : 'failed', error)
  }
}

/** Disconnects the sensor. Safe to call when nothing is connected. */
export function disconnect() {
  intentionalDisconnect = true
  try {
    if (device?.gatt?.connected) device.gatt.disconnect()
  } catch (error) {
    console.error('[bluetooth] Disconnect failed', error)
  }
  releaseDevice()
  setState({ status: 'disconnected', deviceName: null, lastBpm: null, error: null })
}
