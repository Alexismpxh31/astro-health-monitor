import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireSession from './auth/RequireSession.jsx'
import { ROLE } from './auth/session.js'
import Layout from './components/Layout.jsx'
import Alerts from './pages/Alerts.jsx'
import Checkin from './pages/Checkin.jsx'
import Comms from './pages/Comms.jsx'
import Crew from './pages/Crew.jsx'
import CrewMember from './pages/CrewMember.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import MissionOverview from './pages/home/MissionOverview.jsx'
import MissionList from './pages/missions/MissionList.jsx'
import Sensors from './pages/Sensors.jsx'
import SystemDetail from './pages/SystemDetail.jsx'
import Vitals from './pages/Vitals.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          {/* Every other route needs a session; without one it redirects to /login. */}
          <Route element={<RequireSession />}>
            <Route path="/" element={<Home />} />
            <Route path="/vitals" element={<Vitals />} />
            <Route path="/system/:id" element={<SystemDetail />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/comms" element={<Comms />} />
            {/* Flight surgeon, plus the crew medical officer in read-only mode.
                Other astronauts are sent back to the home page. */}
            <Route element={<RequireSession roleCode={ROLE.FLIGHT_SURGEON} allowMedicalOfficer />}>
              <Route path="/missions" element={<MissionList />} />
              <Route path="/missions/:missionId" element={<MissionOverview />} />
              <Route path="/crew" element={<Crew />} />
              <Route path="/crew/:userId" element={<CrewMember />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
