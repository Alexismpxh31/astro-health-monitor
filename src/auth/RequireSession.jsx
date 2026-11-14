import { Navigate, Outlet } from 'react-router-dom'
import { homePathFor, useSession } from './session.js'

/**
 * Route guard. Without a session every child route redirects to /login.
 * - `roleCode`: only that role may enter, plus the crew medical officer when
 *   `allowMedicalOfficer` is set (read-only view of crewmates).
 * - `exceptRoleCode`: every role but that one may enter.
 * Users that may not enter are sent to the landing page of their role
 * (flight surgeon -> /crew, everyone else -> /).
 *
 * @param {{ roleCode?: string, exceptRoleCode?: string, allowMedicalOfficer?: boolean }} props
 */
export default function RequireSession({ roleCode, exceptRoleCode, allowMedicalOfficer = false }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  const roleAllowed = !roleCode || session.roleCode === roleCode || (allowMedicalOfficer && session.isMedicalOfficer)
  const notExcluded = !exceptRoleCode || session.roleCode !== exceptRoleCode
  if (!roleAllowed || !notExcluded) return <Navigate to={homePathFor(session.roleCode)} replace />
  return <Outlet />
}
