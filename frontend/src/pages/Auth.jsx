import React, { useState, useEffect } from 'react'
import { getApiUrl } from '../config'
import ThemeSelector from '../components/ThemeSelector'
import { useTheme } from '../context/ThemeContext'
import { getPasswordStrength } from '../utils/helpers'

const Auth = ({ user, setUser, addLog }) => {
  const { colorTheme } = useTheme()
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    name: '', email: '', password: '', phone: '',
    shop_name: '', shop_type: 'Retail', address_line1: '',
    city: '', state: '', pincode: '', gst_number: '',
    company_code: ''
  })
  const [role, setRole] = useState('customer') // 'customer', 'owner', 'employee'

  const [registerLoading, setRegisterLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })
  const [showResetNewPassword, setShowResetNewPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e, directEmail = null, directPassword = null) => {
    if (e) e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const credentials = directEmail ? { email: directEmail, password: directPassword } : loginForm
    try {
      const res = await fetch(getApiUrl('api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        if (data.token) {
          localStorage.setItem('promptdb_token', data.token)
          sessionStorage.setItem('promptdb_token', data.token)
        }
        if (rememberMe) {
          localStorage.setItem('promptdb_user', JSON.stringify(data.user))
        } else {
          sessionStorage.setItem('promptdb_user', JSON.stringify(data.user))
        }
        setLoginForm({ email: '', password: '' })
        addLog(`Welcome, ${data.user.name}!`, 'success')
      } else {
        const err = await res.json()
        setLoginError(err.detail || 'Login failed')
      }
    } catch (err) {
      setLoginError('Connection error')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoginError('')

    // Owner GST regex check
    if (role === 'owner') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstRegex.test(registerForm.gst_number.toUpperCase())) {
        setLoginError('Invalid GST Format (15 chars, e.g. 22AAAAA0000A1Z5)')
        return
      }
    }

    setRegisterLoading(true)
    try {
      let endpoint = 'api/auth/register'
      let payload = {}

      if (role === 'owner') {
        endpoint = 'api/auth/register/owner'
        payload = {
          email: registerForm.email,
          password: registerForm.password,
          name: registerForm.name,
          phone: registerForm.phone,
          gst_number: registerForm.gst_number.toUpperCase(),
          shop_name: registerForm.shop_name,
          shop_type: registerForm.shop_type,
          address_line1: registerForm.address_line1,
          city: registerForm.city,
          state: registerForm.state,
          pincode: registerForm.pincode
        }
      } else if (role === 'employee') {
        endpoint = 'api/auth/register/employee'
        payload = {
          email: registerForm.email,
          password: registerForm.password,
          name: registerForm.name,
          phone: registerForm.phone,
          company_code: registerForm.company_code.toUpperCase()
        }
      } else {
        payload = {
          name: registerForm.name,
          email: registerForm.email,
          phone: registerForm.phone || null,
          password: registerForm.password
        }
      }

      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        const userObj = data.user ? data.user : data
        const token = data.token || null

        if (token) {
          localStorage.setItem('promptdb_token', token)
          sessionStorage.setItem('promptdb_token', token)
        }

        setUser(userObj)
        localStorage.setItem('promptdb_user', JSON.stringify(userObj))
        setShowRegister(false)
        setRegisterForm({
          name: '', email: '', password: '', phone: '',
          shop_name: '', shop_type: 'Retail', address_line1: '',
          city: '', state: '', pincode: '', gst_number: '',
          company_code: ''
        })
        setRole('customer')
        addLog(`Registered and logged in!`, 'success')
      } else {
        const err = await res.json()
        setLoginError(err.detail || 'Registration failed')
      }
    } catch (err) {
      setLoginError('Connection error')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotMessage('')
    setForgotLoading(true)
    try {
      const res = await fetch(getApiUrl('api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      })
      const data = await res.json()
      if (res.ok) {
        setForgotMessage(data.message)
        if (data.reset_token) {
          setResetToken(data.reset_token)
        }
      } else {
        setLoginError(data.detail || 'Password reset request failed')
      }
    } catch (err) {
      setLoginError('Connection error')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyResetToken = async () => {
    try {
      const res = await fetch(getApiUrl('api/auth/verify-reset-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken })
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setShowResetPassword(true)
        setForgotMessage(`Token verified for ${data.email}. Please set new password.`)
      } else {
        setLoginError('Invalid or expired reset token')
      }
    } catch (err) {
      setLoginError('Verification failed')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (resetForm.password !== resetForm.confirmPassword) {
      setResetMessage('Passwords do not match')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch(getApiUrl('api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: resetForm.password })
      })
      const data = await res.json()
      if (res.ok) {
        setResetMessage(data.message)
        setTimeout(() => {
          backToLogin()
        }, 3000)
      } else {
        setResetMessage(data.detail || 'Reset failed')
      }
    } catch (err) {
      setResetMessage('Reset error')
    } finally {
      setResetLoading(false)
    }
  }

  const backToLogin = () => {
    setShowForgotPassword(false)
    setShowResetPassword(false)
    setResetToken('')
    setForgotEmail('')
    setForgotMessage('')
    setResetMessage('')
    setLoginError('')
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
        <ThemeSelector />
      </div>
      
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo-icon">🏪</div>
          <h1>Prompt-DB</h1>
          <p>Real-time Business & Analytics Command Center</p>
        </div>

        {showForgotPassword ? (
          showResetPassword ? (
            <form onSubmit={handleResetPassword} className="login-form">
              <h2>Reset Password</h2>
              {resetMessage && <div className="info-msg">{resetMessage}</div>}
              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input type={showResetNewPassword ? "text" : "password"} value={resetForm.password} onChange={e => setResetForm({ ...resetForm, password: e.target.value })} required />
                  <button type="button" className="password-toggle" onClick={() => setShowResetNewPassword(!showResetNewPassword)}>
                    {showResetNewPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" value={resetForm.confirmPassword} onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })} required />
              </div>
              <button type="submit" className="login-btn" disabled={resetLoading}>
                {resetLoading ? <><span className="spinner"></span> Resetting...</> : 'Save Password'}
              </button>
              <p className="switch-auth"><button type="button" onClick={backToLogin}>Back to Login</button></p>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="login-form">
              <h2>Forgot Password</h2>
              {forgotMessage && <div className="info-msg">{forgotMessage}</div>}
              {loginError && <div className="error-msg">{loginError}</div>}
              
              {resetToken && (
                <div className="token-verification-box" style={{ margin: '15px 0', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '10px' }}>A debug token has been generated. Click below to verify:</p>
                  <code style={{ display: 'block', padding: '8px', background: '#000', color: '#ff6b00', borderRadius: '4px', fontSize: '0.8rem', overflowX: 'auto', marginBottom: '15px' }}>{resetToken}</code>
                  <button type="button" className="login-btn secondary-btn" onClick={handleVerifyResetToken}>
                    Reset Password Now
                  </button>
                </div>
              )}
              {!resetToken && (
                <>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className="login-btn" disabled={forgotLoading}>
                    {forgotLoading ? <><span className="spinner"></span> Sending...</> : 'Send Reset Link'}
                  </button>
                </>
              )}
              <p className="switch-auth"><button type="button" onClick={backToLogin}>Back to Login</button></p>
            </form>
          )
        ) : showRegister ? (
          <form onSubmit={handleRegister} className="login-form">
            <h2>Create Account</h2>
            {loginError && <div className="error-msg">{loginError}</div>}
            
            <div className="role-selector">
              <button 
                type="button" 
                className={`role-btn ${role === 'customer' ? 'active' : ''}`}
                onClick={() => setRole('customer')}
              >
                👤 Customer
              </button>
              <button 
                type="button" 
                className={`role-btn ${role === 'owner' ? 'active' : ''}`}
                onClick={() => setRole('owner')}
              >
                👑 Owner
              </button>
              <button 
                type="button" 
                className={`role-btn ${role === 'employee' ? 'active' : ''}`}
                onClick={() => setRole('employee')}
              >
                💼 Employee
              </button>
            </div>

            <div className="form-group">
              <label>Name</label>
              <input type="text" value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input type={showRegisterPassword ? "text" : "password"} value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} required />
                <button type="button" className="password-toggle" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                  {showRegisterPassword ? "🙈" : "👁"}
                </button>
              </div>
              {registerForm.password && (
                <div className="password-strength">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map(level => (
                      <div
                        key={level}
                        className={`strength-bar ${level <= getPasswordStrength(registerForm.password).score ? 'active' : ''}`}
                        style={{ backgroundColor: level <= getPasswordStrength(registerForm.password).score ? getPasswordStrength(registerForm.password).color : '' }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: getPasswordStrength(registerForm.password).color }}>
                    {getPasswordStrength(registerForm.password).label}
                  </span>
                </div>
              )}
            </div>

            {role === 'owner' && (
              <div className="shop-details-section">
                <h3 style={{ margin: '20px 0 15px', paddingBottom: '8px', borderBottom: '1px solid var(--border-primary)', fontSize: '1.1rem', color: 'var(--accent-secondary)' }}>🏪 Shop Setup</h3>
                <div className="form-group">
                  <label>Shop Name *</label>
                  <input 
                    type="text" 
                    value={registerForm.shop_name} 
                    onChange={e => setRegisterForm({ ...registerForm, shop_name: e.target.value })} 
                    required={role === 'owner'} 
                  />
                </div>
                <div className="form-group">
                  <label>Type of Shop *</label>
                  <select 
                    value={registerForm.shop_type} 
                    onChange={e => setRegisterForm({ ...registerForm, shop_type: e.target.value })} 
                    required={role === 'owner'}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Distribution">Distribution</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>GST Number *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={registerForm.gst_number} 
                    onChange={e => setRegisterForm({ ...registerForm, gst_number: e.target.value })} 
                    required={role === 'owner'}
                  />
                </div>
                <div className="form-group">
                  <label>Address Line 1 *</label>
                  <input 
                    type="text" 
                    value={registerForm.address_line1} 
                    onChange={e => setRegisterForm({ ...registerForm, address_line1: e.target.value })} 
                    required={role === 'owner'}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City *</label>
                    <input 
                      type="text" 
                      value={registerForm.city} 
                      onChange={e => setRegisterForm({ ...registerForm, city: e.target.value })} 
                      required={role === 'owner'}
                    />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input 
                      type="text" 
                      value={registerForm.state} 
                      onChange={e => setRegisterForm({ ...registerForm, state: e.target.value })} 
                      required={role === 'owner'}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input 
                    type="text" 
                    value={registerForm.pincode} 
                    onChange={e => setRegisterForm({ ...registerForm, pincode: e.target.value })} 
                    required={role === 'owner'}
                  />
                </div>
              </div>
            )}

            {role === 'employee' && (
              <div className="shop-details-section">
                <h3 style={{ margin: '20px 0 15px', paddingBottom: '8px', borderBottom: '1px solid var(--border-primary)', fontSize: '1.1rem', color: 'var(--accent-secondary)' }}>💼 Employee Registration</h3>
                <div className="form-group">
                  <label>Company Registration Code (SHOP-XXXX) *</label>
                  <input 
                    type="text" 
                    placeholder="Provided by Shop Owner"
                    value={registerForm.company_code} 
                    onChange={e => setRegisterForm({ ...registerForm, company_code: e.target.value })} 
                    required={role === 'employee'} 
                  />
                </div>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={registerLoading}>
              {registerLoading ? <><span className="spinner"></span> Registering...</> : 'Register'}
            </button>
            <p className="switch-auth">Already have an account? <button type="button" onClick={() => setShowRegister(false)}>Login</button></p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            <h2>Login</h2>
            {loginError && <div className="error-msg">{loginError}</div>}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input type={showLoginPassword ? "text" : "password"} value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                <button type="button" className="password-toggle" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                  {showLoginPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button type="button" className="forgot-link" onClick={() => setShowForgotPassword(true)}>Forgot Password?</button>
            </div>
            <button type="submit" className="login-btn" disabled={loginLoading}>
              {loginLoading ? <><span className="spinner"></span> Logging in...</> : 'Login'}
            </button>
            <p className="switch-auth">New here? <button type="button" onClick={() => setShowRegister(true)}>Create Account</button></p>
          </form>
        )}

        {!showForgotPassword && (
          <div className="demo-accounts">
            <h3>Demo Accounts</h3>
            <div className="demo-list">
              <button type="button" onClick={() => handleLogin(null, 'superadmin@promptdb.com', 'qwert12345')}>Super Admin</button>
              <button type="button" onClick={() => handleLogin(null, 'admin@promptdb.com', 'qwert12345')}>Admin</button>
              <button type="button" onClick={() => handleLogin(null, 'customer@promptdb.com', 'qwert12345')}>Customer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Auth
