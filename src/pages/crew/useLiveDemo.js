import { useSyncExternalStore } from 'react'
import { getLiveDemoStatus, startLiveDemo, stopLiveDemo, subscribeLiveDemo } from '../../data/liveDemo.js'

/** @returns {{ isLive: boolean, hasError: boolean, toggle: () => void }} */
export function useLiveDemo() {
  const status = useSyncExternalStore(subscribeLiveDemo, getLiveDemoStatus)
  const isLive = status === 'running'
  return {
    isLive,
    hasError: status === 'error',
    toggle: () => (isLive ? stopLiveDemo() : startLiveDemo()),
  }
}
