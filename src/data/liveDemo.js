import { addLiveDemoReadings } from './demoCrew.js'

// Live demo controller shared by every page: keeps running while the flight
// surgeon moves between the crew table and a crew member's detail.

const LIVE_INTERVAL_MS = 2500

let intervalId = null
let isWriting = false
let status = 'stopped' // 'stopped' | 'running' | 'error'
const listeners = new Set()

function setStatus(next) {
  status = next
  listeners.forEach((listener) => listener())
}

async function tick() {
  if (isWriting) return // previous write still running: skip this tick
  isWriting = true
  try {
    await addLiveDemoReadings()
  } catch (error) {
    console.error('[liveDemo] Live simulation failed', error)
    stopLiveDemo()
    setStatus('error')
  } finally {
    isWriting = false
  }
}

export function startLiveDemo() {
  if (intervalId !== null) return
  intervalId = setInterval(tick, LIVE_INTERVAL_MS)
  setStatus('running')
  tick()
}

export function stopLiveDemo() {
  if (intervalId === null) return
  clearInterval(intervalId)
  intervalId = null
  setStatus('stopped')
}

/** @returns {'stopped'|'running'|'error'} */
export function getLiveDemoStatus() {
  return status
}

export function subscribeLiveDemo(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
