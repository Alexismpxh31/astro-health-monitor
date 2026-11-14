import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './session.js'

/**
 * Route guard. Without a session every child route redirects to /login.
 * With `roleCode`, users of any other role are sent to the home page.
 *
 * @param {{ roleCode?: string }} props
 */
export default function RequireSession({ roleCode }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  if (roleCode && session.roleCode !== roleCode) return <Navigate to="/" replace />
  return <Outlet />
}
