import React, { useState } from 'react'
import { getApiUrl } from '../config'
import ThemeSelector from '../components/ThemeSelector'
import { useTheme } from '../context/ThemeContext'

const OwnerCompleteProfile = ({ user, setUser, addLog }) => {
  const { colorTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    profile_photo_url: '',
    pan_number: '',
    bank_account_name: '',
    bank_account_number: '',
    ifsc_code: '',
    upi_id: '',
    business_description: '',
    operating_since: new Date().getFullYear(),
    employee_count_range: '1-5',
    connection_string: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number.toUpperCase())) {
      setError('Invalid PAN number format (e.g. ABCDE1234F)')
      return
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc_code.toUpperCase())) {
      setError('Invalid IFSC Code format (e.g. SBIN0001234)')
      return
    }

    setLoading(true)
    try {
      const token = user.token || localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token')
      const profileRes = await fetch(getApiUrl('api/profile/owner/complete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_photo_url: form.profile_photo_url || null,
          pan_number: form.pan_number.toUpperCase() || null,
          bank_account_name: form.bank_account_name,
          bank_account_number: form.bank_account_number,
          ifsc_code: form.ifsc_code.toUpperCase(),
          upi_id: form.upi_id || null,
          business_description: form.business_description || null,
          operating_since: parseInt(form.operating_since) || null,
          employee_count_range: form.employee_count_range
        })
      })

      if (!profileRes.ok) {
        const err = await profileRes.json()
        setError(err.detail || 'Failed to save profile details')
        setLoading(false)
        return
      }

      const updatedUser = await profileRes.json()

      if (form.connection_string) {
        const dbRes = await fetch(getApiUrl('api/profile/db-credential'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ connection_string: form.connection_string })
        })

        if (!dbRes.ok) {
          const dbErr = await dbRes.json()
          setError(`Profile saved, but DB Connection failed: ${dbErr.detail}`)
          setLoading(false)
          updatedUser.profile_complete = true
          setUser(updatedUser)
          localStorage.setItem('promptdb_user', JSON.stringify(updatedUser))
          return
        }
        updatedUser.db_connected = true
      }

      updatedUser.profile_complete = true
      setUser(updatedUser)
      const storageKey = localStorage.getItem('promptdb_user') ? 'localStorage' : 'sessionStorage'
      if (storageKey === 'localStorage') {
        localStorage.setItem('promptdb_user', JSON.stringify(updatedUser))
      } else {
        sessionStorage.setItem('promptdb_user', JSON.stringify(updatedUser))
      }
      addLog('Profile completed successfully!', 'success')
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
        
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Complete Your Shop Profile</h2>
        <p style={{ fontSize: '13px', color: '#a3a3a3', margin: '0 0 28px 0' }}>Please enter your business detail and database configuration to activate your owner panel.</p>

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
              <label style={labelStyle}>Business PAN Number</label>
              <input
                type="text"
                name="pan_number"
                value={form.pan_number}
                onChange={handleChange}
                placeholder="ABCDE1234F"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>Bank Account Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Account Holder Name</label>
                <input
                  type="text"
                  name="bank_account_name"
                  value={form.bank_account_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={form.bank_account_number}
                  onChange={handleChange}
                  required
                  placeholder="123456789012"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>IFSC Code</label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={form.ifsc_code}
                  onChange={handleChange}
                  required
                  placeholder="SBIN0001234"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: '10px' }}>UPI ID (Optional)</label>
              <input
                type="text"
                name="upi_id"
                value={form.upi_id}
                onChange={handleChange}
                placeholder="john@okaxis"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={grid2Style}>
            <div>
              <label style={labelStyle}>Operating Since (Year)</label>
              <input
                type="number"
                name="operating_since"
                value={form.operating_since}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Number of Employees</label>
              <select
                name="employee_count_range"
                value={form.employee_count_range}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="1-5">1-5 employees</option>
                <option value="6-20">6-20 employees</option>
                <option value="21-50">21-50 employees</option>
                <option value="50+">50+ employees</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Business Description</label>
            <textarea
              name="business_description"
              value={form.business_description}
              onChange={handleChange}
              rows={2}
              placeholder="Tell us about your business..."
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>Connect your database (Optional)</div>
            <p style={{ fontSize: '12px', color: '#a3a3a3', margin: '-4px 0 14px 0', lineHeight: '1.4' }}>
              Stored encrypted to enable advanced analytics from transaction data.
            </p>
            <input
              type="password"
              name="connection_string"
              value={form.connection_string}
              onChange={handleChange}
              placeholder="postgresql://user:password@host:port/dbname"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            onMouseOver={(e) => e.target.style.backgroundColor = '#E05E00'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF6B00'}
          >
            {loading ? 'Saving Profile...' : 'Save & Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default OwnerCompleteProfile
