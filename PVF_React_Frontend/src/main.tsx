import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router'
import './index.css'
import Home from './pages/Home.tsx'
import About from './pages/About.tsx'
import Events from './pages/Events.tsx'
import Registration from './pages/Registration.tsx'
import Resources from './pages/Resources.tsx'
import VisionCheck from './pages/VisionCheck.tsx'
import Register from './pages/Register.tsx'
import LogIn from './pages/LogIn.tsx'
import Participants from './pages/Participants.tsx'
import AdminUsers from './pages/AdminUsers.tsx'
import Dashboard from './pages/Dashboard.tsx'
import { AuthProvider, useAuth } from './context/AuthContext.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import { signOut } from 'firebase/auth'
import { auth } from './firebase.ts'

function Nav() {
  const { user, role } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const visibleLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/events', label: 'Events' },
    { to: '/register', label: 'Register' },
    { to: '/vision-check', label: 'Vision Check' },
    { to: '/resources', label: 'Resources' },
  ]

  if (user && (role === 'doctor' || role === 'admin')) {
    visibleLinks.push({ to: '/participants', label: 'Participants' })
    visibleLinks.push({ to: '/dashboard', label: 'Dashboard' })
  }

  const adminLinks = role === 'admin' ? [{ to: '/admin-users', label: 'Admin Users' }] : []

  const handleLogout = async () => {
    await signOut(auth)
    setMenuOpen(false)
  }

  const displayName = useMemo(() => {
    if (!user) return ''

    const fromDisplay = user.displayName?.trim()
    if (fromDisplay) return fromDisplay.split(' ')[0]

    const emailName = user.email?.split('@')[0] ?? 'User'
    return emailName
  }, [user])

  return (
    <nav className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link to="/" className="font-bold text-blue-800 text-lg">Prime Focus Inc.</Link>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-700">
          {visibleLinks.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-blue-700">{l.label}</Link>
          ))}
          {adminLinks.map((l) => (
            <Link key={l.to} to={l.to} className="font-semibold text-red-700 hover:text-red-800">{l.label}</Link>
          ))}
        </div>
        {user ? (
          <div className="ml-auto relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded bg-blue-700 px-3 py-1 text-sm font-medium text-white"
            >
              Hi, {displayName}
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-64 rounded border border-gray-200 bg-white p-4 shadow-lg">
                <p className="text-sm font-semibold text-gray-900">{user.displayName || 'User Profile'}</p>
                <p className="mt-1 text-sm text-gray-600">{user.email}</p>
                <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium uppercase tracking-wide text-blue-700">
                  {role || 'basic-user'}
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-4 w-full rounded bg-gray-800 px-3 py-2 text-sm text-white"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link to="/login" className="ml-auto rounded bg-blue-700 px-3 py-1 text-sm text-white">
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LogIn />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/register" element={<Registration />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/vision-check" element={<VisionCheck />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/participants/:email" element={<Participants />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-users" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <Nav />
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
