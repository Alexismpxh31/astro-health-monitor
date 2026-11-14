// Which user the app acts for when nothing else says so.
// The demo astronaut comes from the seed (never a hand-written id), so it cannot
// drift away from src/data/seed/users.json again.

import { getSession } from '../auth/session.js'
import catalogs from './seed/catalogs.json'
import usersSeed from './seed/users.json'

const ASTRONAUT_ROLE_CODE = 'astronaut'
// Last resort only, used if the seed lookup below finds nothing: "Astronaut One (demo)".
const LAST_RESORT_ASTRONAUT_ID = 'a0000000-0000-4000-8000-000000000002'

const astronautRoleId = catalogs.roles.find((role) => role.code === ASTRONAUT_ROLE_CODE)?.id

/** Id of the demo astronaut: the first user with the astronaut role in users.json. */
export const DEMO_ASTRONAUT_ID =
  usersSeed.users.find((user) => user.roleId === astronautRoleId)?.id ?? LAST_RESORT_ASTRONAUT_ID

/**
 * User that health data belongs to by default: the logged-in user, or the demo
 * astronaut when nobody is logged in.
 *
 * A logged-in seed user who is not an astronaut (the flight surgeon) is skipped:
 * readings stored under that id would not show up in any panel.
 *
 * @returns {string} user id (UUID).
 */
export function defaultUserId() {
  const sessionUserId = getSession()?.userId
  if (!sessionUserId) return DEMO_ASTRONAUT_ID
  const seedUser = usersSeed.users.find((user) => user.id === sessionUserId)
  if (seedUser && seedUser.roleId !== astronautRoleId) return DEMO_ASTRONAUT_ID
  return sessionUserId
}
