import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Auth from './pages/Auth'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CustomerView from './pages/CustomerView'
import OwnerCompleteProfile from './pages/OwnerCompleteProfile'
import EmployeeCompleteProfile from './pages/EmployeeCompleteProfile'
import { getApiUrl } from './config'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [logs, setLogs] = useState([])

  const addLog = (message, type = 'info') => {
    setLogs(prev => [{ message, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30))
  }

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token')
      if (!token) {
        setAuthLoading(false)
        return
      }

      try {
        // Always fetch fresh user data from the server to avoid stale cache issues
        const res = await fetch(getApiUrl('api/auth/me'), {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (res.ok) {
          const freshUser = await res.json()
          setUser(freshUser)
          // Update storage with fresh data
          if (localStorage.getItem('promptdb_token')) {
            localStorage.setItem('promptdb_user', JSON.stringify(freshUser))
          } else {
            sessionStorage.setItem('promptdb_user', JSON.stringify(freshUser))
          }
        } else {
          // Token expired or invalid — clear everything
          localStorage.removeItem('promptdb_user')
          localStorage.removeItem('promptdb_token')
          sessionStorage.removeItem('promptdb_user')
          sessionStorage.removeItem('promptdb_token')
        }
      } catch (err) {
        // Network error — fall back to cached user if available
        const savedUser = localStorage.getItem('promptdb_user') || sessionStorage.getItem('promptdb_user')
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)) } catch (_) {}
        }
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()
  }, [])

  const logout = () => {
    setUser(null)
    localStorage.removeItem('promptdb_user')
    localStorage.removeItem('promptdb_token')
    sessionStorage.removeItem('promptdb_user')
    sessionStorage.removeItem('promptdb_token')
    addLog('Logged out', 'info')
  }

  // Show a minimal loading screen while we verify the token
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid #2a2a2a',
          borderTop: '3px solid #FF6B00',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Authenticating...</p>
      </div>
    )
  }

  // Determine which dashboard to show based on role & profile status
  const getDashboardRoute = () => {
    if (!user) return <Navigate to="/auth" />
    if (!user.profile_complete) {
      if (user.role === 'super_admin') return <Navigate to="/owner/complete-profile" />
      if (user.role === 'admin') return <Navigate to="/employee/complete-profile" />
    }
    if (user.role === 'super_admin') return <Navigate to="/super-admin" />
    if (user.role === 'admin') return <Navigate to="/admin" />
    return <Navigate to="/shop" />
  }

  const requireProfileComplete = (element, requiredRole) => {
    if (!user) return <Navigate to="/auth" />
    if (user.role !== requiredRole) return <Navigate to="/auth" />
    if (!user.profile_complete) {
      if (user.role === 'super_admin') return <Navigate to="/owner/complete-profile" />
      if (user.role === 'admin') return <Navigate to="/employee/complete-profile" />
    }
    return element
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={getDashboardRoute()} />
          <Route path="/auth" element={
            user ? getDashboardRoute() : <Auth user={user} setUser={setUser} addLog={addLog} />
          } />
          <Route path="/super-admin" element={
            requireProfileComplete(<SuperAdminDashboard user={user} setUser={setUser} logout={logout} />, 'super_admin')
          } />
          <Route path="/admin" element={
            requireProfileComplete(<AdminDashboard user={user} setUser={setUser} logout={logout} />, 'admin')
          } />
          <Route path="/shop" element={
            user ? <CustomerView user={user} setUser={setUser} logout={logout} /> : <Navigate to="/auth" />
          } />
          <Route path="/owner/complete-profile" element={
            user && user.role === 'super_admin' ? (
              user.profile_complete ? <Navigate to="/super-admin" /> : <OwnerCompleteProfile user={user} setUser={setUser} addLog={addLog} logout={logout} />
            ) : <Navigate to="/auth" />
          } />
          <Route path="/employee/complete-profile" element={
            user && user.role === 'admin' ? (
              user.profile_complete ? <Navigate to="/admin" /> : <EmployeeCompleteProfile user={user} setUser={setUser} addLog={addLog} logout={logout} />
            ) : <Navigate to="/auth" />
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
