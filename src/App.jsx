import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Alerts from './pages/Alerts.jsx'
import Checkin from './pages/Checkin.jsx'
import Comms from './pages/Comms.jsx'
import Crew from './pages/Crew.jsx'
import CrewMember from './pages/CrewMember.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Sensors from './pages/Sensors.jsx'
import SystemDetail from './pages/SystemDetail.jsx'
import Vitals from './pages/Vitals.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* TODO(auth): protect every route except /login once src/auth is implemented. */}
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/vitals" element={<Vitals />} />
          <Route path="/system/:id" element={<SystemDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/comms" element={<Comms />} />
          <Route path="/crew" element={<Crew />} />
          <Route path="/crew/:userId" element={<CrewMember />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
