import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './session.js'

/**
 * Route guard. Without a session every child route redirects to /login.
 * With `roleCode`, users of any other role are sent to the home page, except the crew
 * medical officer when `allowMedicalOfficer` is set (read-only view of crewmates).
 *
 * @param {{ roleCode?: string, allowMedicalOfficer?: boolean }} props
 */
export default function RequireSession({ roleCode, allowMedicalOfficer = false }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  const allowed = !roleCode || session.roleCode === roleCode || (allowMedicalOfficer && session.isMedicalOfficer)
  if (!allowed) return <Navigate to="/" replace />
  return <Outlet />
}
