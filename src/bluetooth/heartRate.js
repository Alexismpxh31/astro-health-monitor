// Web Bluetooth heart rate monitor (STUB).
// Uses the standard GATT Heart Rate service (0x180D) and
// Heart Rate Measurement characteristic (0x2A37).

export const HEART_RATE_SERVICE = 'heart_rate'
export const HEART_RATE_MEASUREMENT = 'heart_rate_measurement'

/** @returns {boolean} true if the browser supports Web Bluetooth. */
export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/**
 * Asks the user to pick a BLE heart rate sensor and streams its readings.
 * Must be called from a user gesture (click/tap).
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {(reading: import('../models/reading.js').Reading) => void} options.onReading
 * @returns {Promise<() => void>} disconnect function.
 */
export async function connectHeartRate(options) {
  // TODO:
  // 1. device = await navigator.bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] })
  // 2. server = await device.gatt.connect()
  // 3. characteristic = (await server.getPrimaryService(HEART_RATE_SERVICE))
  //      .getCharacteristic(HEART_RATE_MEASUREMENT)
  // 4. startNotifications(); on 'characteristicvaluechanged':
  //      bpm = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1)
  //      onReading(createReading({ userId, indicatorCode: 'HR', value: bpm, unit: 'bpm', source: 'ble' }))
  // 5. return () => device.gatt.disconnect()
  console.warn('[bluetooth] connectHeartRate is not implemented yet', options)
  return () => {}
}
