// Secure-context checks.
// The app must be served over HTTPS: installing the PWA, the service worker, the
// Notification API, Web Bluetooth and Web Crypto (PIN login) only exist in a
// secure context. The browser treats localhost as secure, so development works.

/** @returns {boolean} true when the page runs in a secure context (https:// or localhost). */
export function isSecureContext() {
  return typeof window !== 'undefined' && window.isSecureContext === true
}

/** @returns {boolean} true when the service worker API is available (offline app, installable PWA). */
export function hasServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

/** @returns {boolean} true when the Notification API is available. */
export function hasNotifications() {
  return typeof Notification !== 'undefined'
}

/** @returns {boolean} true when Web Bluetooth is available (not in Safari or Firefox). */
export function hasBluetooth() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/**
 * Snapshot of what this browser and context can do.
 *
 * @returns {{ secureContext: boolean, serviceWorker: boolean, notifications: boolean, bluetooth: boolean }}
 */
export function getCapabilities() {
  return {
    secureContext: isSecureContext(),
    serviceWorker: hasServiceWorker(),
    notifications: hasNotifications(),
    bluetooth: hasBluetooth(),
  }
}

/**
 * Same address with the https:// scheme, to offer it when the page was opened
 * over http://. Empty string outside a browser.
 *
 * @returns {string}
 */
export function httpsUrl() {
  if (typeof window === 'undefined') return ''
  const { host, pathname, search, hash } = window.location
  return `https://${host}${pathname}${search}${hash}`
}
