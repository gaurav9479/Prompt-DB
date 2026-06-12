import React, { useState } from 'react'
import { getApiUrl } from '../config'
import ThemeSelector from '../components/ThemeSelector'
import { useTheme } from '../context/ThemeContext'

const EmployeeCompleteProfile = ({ user, setUser, addLog, logout }) => {
  const { colorTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    profile_photo_url: '',
    dob: '',
    gender: 'Male',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    home_address: '',
    id_proof_type: 'Aadhaar',
    id_proof_number: '',
    branch_name: '',
    branch_address: '',
    branch_type: 'Main Branch'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.emergency_contact_phone && !/^[0-9]{10}$/.test(form.emergency_contact_phone)) {
      setError('Emergency contact phone must be exactly 10 digits')
      return
    }

    setLoading(true)
    try {
      const token = user.token || localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token')
      const res = await fetch(getApiUrl('api/profile/employee/complete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_photo_url: form.profile_photo_url || null,
          dob: form.dob || null,
          gender: form.gender,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          home_address: form.home_address || null,
          id_proof_type: form.id_proof_type,
          id_proof_number: form.id_proof_number || null,
          branch_name: form.branch_name,
          branch_address: form.branch_address,
          branch_type: form.branch_type
        })
      })

      if (res.ok) {
        const updatedUser = await res.json()
        updatedUser.profile_complete = true

        setUser(updatedUser)
        const storageKey = localStorage.getItem('promptdb_user') ? 'localStorage' : 'sessionStorage'
        if (storageKey === 'localStorage') {
          localStorage.setItem('promptdb_user', JSON.stringify(updatedUser))
        } else {
          sessionStorage.setItem('promptdb_user', JSON.stringify(updatedUser))
        }
        addLog('Employee profile completed successfully!', 'success')
      } else {
        const err = await res.json()
        setError(err.detail || 'Failed to complete profile')
      }
    } catch (err) {
      setError('Connection error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxSizing: 'border-box'
  }

  const cardStyle = {
    width: '100%',
    maxWidth: '640px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #2e2e2e',
    borderRadius: '16px',
    padding: '36px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box'
  }

  const accentLineStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    backgroundColor: '#FF6B00'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#a3a3a3',
    marginBottom: '8px'
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#121212',
    border: '1px solid #3e3e3e',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'white',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    outline: 'none'
  }

  const sectionTitleStyle = {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#FF6B00',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '14px',
    borderBottom: '1px solid #2e2e2e',
    paddingBottom: '6px'
  }

  const sectionBoxStyle = {
    backgroundColor: '#171717',
    border: '1px solid #2b2b2b',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    boxSizing: 'border-box'
  }

  const buttonStyle = {
    width: '100%',
    backgroundColor: '#FF6B00',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }

  const grid2Style = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px'
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={accentLineStyle} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 28px 0' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Complete Employee Onboarding</h2>
            <p style={{ fontSize: '13px', color: '#a3a3a3', margin: 0 }}>Please complete your personal record and assign your primary working branch.</p>
          </div>
          <button 
            type="button" 
            onClick={logout}
            style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            🚪 Logout
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={grid2Style}>
            <div>
              <label style={labelStyle}>Profile Photo URL</label>
              <input
                type="text"
                name="profile_photo_url"
                value={form.profile_photo_url}
                onChange={handleChange}
                placeholder="https://example.com/photo.jpg"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={grid2Style}>
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
              <div>
                <label style={labelStyle}>ID Type</label>
                <select
                  name="id_proof_type"
                  value={form.id_proof_type}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">DL</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>ID Number</label>
                <input
                  type="text"
                  name="id_proof_number"
                  value={form.id_proof_number}
                  onChange={handleChange}
                  required
                  placeholder="ID Number"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>Emergency Contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={form.emergency_contact_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Spouse, Parent"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Contact Phone</label>
                <input
                  type="text"
                  name="emergency_contact_phone"
                  value={form.emergency_contact_phone}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 9876543210"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Home Address</label>
            <textarea
              name="home_address"
              value={form.home_address}
              onChange={handleChange}
              rows={2}
              placeholder="Enter your current residential address..."
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>Branch Assignment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Branch Name</label>
                <input
                  type="text"
                  name="branch_name"
                  value={form.branch_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Bangalore Store"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Branch Type</label>
                <select
                  name="branch_type"
                  value={form.branch_type}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="Main Branch">Main Branch</option>
                  <option value="Sub Branch">Sub Branch</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Outlet">Outlet</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: '10px' }}>Branch Address</label>
              <input
                type="text"
                name="branch_address"
                value={form.branch_address}
                onChange={handleChange}
                required
                placeholder="Street address of the branch"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            onMouseOver={(e) => e.target.style.backgroundColor = '#E05E00'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF6B00'}
          >
            {loading ? 'Completing Onboarding...' : 'Complete Profile & Start Work'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EmployeeCompleteProfile
