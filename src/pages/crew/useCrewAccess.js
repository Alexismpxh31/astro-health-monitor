import { ROLE, useSession } from '../../auth/session.js'

/**
 * Who can change things in the crew panel. The flight surgeon manages thresholds,
 * notes and the demo simulation; the crew medical officer only views (read-only).
 *
 * @returns {boolean} true for the flight surgeon.
 */
export function useCanManageCrew() {
  return useSession()?.roleCode === ROLE.FLIGHT_SURGEON
}
