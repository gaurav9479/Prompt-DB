import React, { useState } from 'react'
import { getApiUrl } from '../config'

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
    animation: 'fadeInOverlay 0.2s ease'
  },
  panel: {
    width: '100%', maxWidth: '600px',
    background: '#111',
    border: '1px solid rgba(255,85,0,0.25)',
    borderRadius: '20px',
    boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,85,0,0.08)',
    overflow: 'hidden',
    animation: 'slideUpPanel 0.25s ease',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
    borderBottom: '1px solid rgba(255,85,0,0.15)',
    padding: '24px 28px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  avatar: {
    width: '52px', height: '52px', borderRadius: '50%',
    border: '2px solid rgba(255,85,0,0.4)',
    objectFit: 'cover', background: '#222',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', color: '#ff5500',
    flexShrink: 0,
  },
  name: { color: '#fff', fontSize: '17px', fontWeight: '700', marginBottom: '3px' },
  role: { color: '#ff6622', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' },
  body: { padding: '24px 28px', overflowY: 'auto', flex: 1 },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.12em', color: '#ff5500',
    marginBottom: '14px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,85,0,0.15)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: '14px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' },
  input: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '10px 12px',
    fontSize: '13px', color: '#e8e8e8', fontFamily: 'inherit',
    outline: 'none', transition: 'all 0.2s',
    width: '100%', boxSizing: 'border-box',
  },
  inputReadonly: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '8px', padding: '10px 12px',
    fontSize: '13px', color: '#555', fontFamily: 'inherit',
    cursor: 'not-allowed',
    width: '100%', boxSizing: 'border-box',
  },
  select: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '10px 12px',
    fontSize: '13px', color: '#e8e8e8', fontFamily: 'inherit',
    outline: 'none', transition: 'all 0.2s',
    width: '100%', boxSizing: 'border-box',
    appearance: 'none',
  },
  footer: {
    padding: '18px 28px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', gap: '12px', justifyContent: 'flex-end',
    background: '#0d0d0d',
  },
  saveBtn: {
    padding: '10px 28px',
    background: 'linear-gradient(135deg, #ff5500, #ff7722)',
    border: 'none', borderRadius: '8px',
    color: '#fff', fontWeight: '700', fontSize: '13px',
    cursor: 'pointer', transition: 'all 0.2s',
    letterSpacing: '0.03em',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#888',
    fontWeight: '600', fontSize: '13px',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: '#555', fontSize: '22px', cursor: 'pointer',
    lineHeight: 1, padding: '4px', transition: 'color 0.2s',
  },
  tag: {
    display: 'inline-block', padding: '3px 10px',
    background: 'rgba(255,85,0,0.12)',
    border: '1px solid rgba(255,85,0,0.3)',
    borderRadius: '20px', fontSize: '11px',
    color: '#ff6622', fontWeight: '600',
  },
  successBanner: {
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '8px', padding: '10px 14px',
    color: '#4ade80', fontSize: '13px', marginBottom: '16px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px', padding: '10px 14px',
    color: '#f87171', fontSize: '13px', marginBottom: '16px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
}

const roleLabels = { super_admin: '👑 Owner / Super Admin', admin: '💼 Employee / Admin', customer: '👤 Customer' }
const countRanges = ['1-5', '6-20', '21-50', '51-200', '200+']
const idProofTypes = ['Aadhaar', 'PAN', 'Voter ID', 'Driving License', 'Passport']

export default function ProfilePanel({ user, setUser, onClose }) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    profile_photo_url: user.profile_photo_url || '',

    gst_number: user.gst_number || '',
    shop_name: user.shop_name || '',
    shop_type: user.shop_type || 'Retail',
    address_line1: user.address_line1 || '',
    city: user.city || '',
    state: user.state || '',
    pincode: user.pincode || '',
    pan_number: user.pan_number || '',
    bank_account_name: user.bank_account_name || '',
    bank_account_number: user.bank_account_number || '',
    ifsc_code: user.ifsc_code || '',
    upi_id: user.upi_id || '',
    business_description: user.business_description || '',
    operating_since: user.operating_since || '',
    employee_count_range: user.employee_count_range || '1-5',

    id_proof_type: user.id_proof_type || 'Aadhaar',
    id_proof_number: user.id_proof_number || '',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const token = localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token')
      const res = await fetch(getApiUrl('api/profile/update'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        const updated = await res.json()
        setUser(updated)
        if (localStorage.getItem('promptdb_token')) localStorage.setItem('promptdb_user', JSON.stringify(updated))
        else sessionStorage.setItem('promptdb_user', JSON.stringify(updated))
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 4000)
      } else {
        const err = await res.json()
        setError(err.detail || 'Update failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePwd = async () => {
    setPwdError('')
    setPwdSuccess('')
    if (pwd.newPwd !== pwd.confirm) { setPwdError('Passwords do not match'); return }
    if (pwd.newPwd.length < 6) { setPwdError('Password must be at least 6 characters'); return }
    try {
      const token = localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token')
      const res = await fetch(getApiUrl('api/profile/change-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwd.current, new_password: pwd.newPwd })
      })
      if (res.ok) {
        setPwdSuccess('Password changed!')
        setPwd({ current: '', newPwd: '', confirm: '' })
        setTimeout(() => { setPwdSuccess(''); setChangingPwd(false) }, 3000)
      } else {
        const err = await res.json()
        setPwdError(err.detail || 'Password change failed')
      }
    } catch {
      setPwdError('Network error')
    }
  }

  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUpPanel { from { opacity:0; transform:translateY(30px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        .profile-input:focus { border-color: rgba(255,85,0,0.5) !important; background: rgba(255,85,0,0.05) !important; box-shadow: 0 0 0 3px rgba(255,85,0,0.1) !important; }
        .profile-select { background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23666'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position: right 10px center; background-size:14px; padding-right:32px; }
      `}</style>
      <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={S.panel}>

          {/* Header */}
          <div style={S.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {user.profile_photo_url ? (
                <img src={user.profile_photo_url} alt="" style={{ ...S.avatar, fontSize: undefined }} onError={e => { e.target.style.display='none' }} />
              ) : (
                <div style={S.avatar}>{initials}</div>
              )}
              <div>
                <div style={S.name}>{user.name}</div>
                <div style={S.role}>{roleLabels[user.role] || user.role}</div>
                <div style={{ color: '#444', fontSize: '11px', marginTop: '2px' }}>{user.email}</div>
              </div>
            </div>
            <button style={S.closeBtn} onClick={onClose} title="Close">×</button>
          </div>

          {/* Body */}
          <div style={S.body}>
            {success && <div style={S.successBanner}>✅ {success}</div>}
            {error && <div style={S.errorBanner}>❌ {error}</div>}

            {/* Basic Info — ALL roles */}
            <div style={S.section}>
              <div style={S.sectionTitle}>👤 Basic Information</div>
              <div style={S.grid}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Full Name</label>
                  <input className="profile-input" style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Phone</label>
                  <input className="profile-input" style={S.input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 00000 00000" />
                </div>
              </div>
              <div style={{ ...S.grid1, marginTop: '14px' }}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Profile Photo URL</label>
                  <input className="profile-input" style={S.input} value={form.profile_photo_url} onChange={e => set('profile_photo_url', e.target.value)} placeholder="https://example.com/photo.jpg" />
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Email (cannot be changed)</label>
                  <div style={S.inputReadonly}>{user.email}</div>
                </div>
              </div>
            </div>

            {/* Owner Fields */}
            {user.role === 'super_admin' && (
              <>
                <div style={S.section}>
                  <div style={S.sectionTitle}>🏪 Shop Details</div>
                  <div style={S.grid}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Shop Name</label>
                      <input className="profile-input" style={S.input} value={form.shop_name} onChange={e => set('shop_name', e.target.value)} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Shop Type</label>
                      <select className="profile-input profile-select" style={{ ...S.select }} value={form.shop_type} onChange={e => set('shop_type', e.target.value)}>
                        {['Retail','Wholesale','Distribution','Manufacturing','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>GST Number</label>
                      <input className="profile-input" style={S.input} value={form.gst_number} onChange={e => set('gst_number', e.target.value)} placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Operating Since (Year)</label>
                      <input className="profile-input" style={S.input} type="number" value={form.operating_since} onChange={e => set('operating_since', e.target.value)} placeholder="2020" min="1900" max="2030" />
                    </div>
                  </div>
                  <div style={{ ...S.grid1, marginTop: '14px' }}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Address Line 1</label>
                      <input className="profile-input" style={S.input} value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ ...S.grid, marginTop: '14px' }}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>City</label>
                      <input className="profile-input" style={S.input} value={form.city} onChange={e => set('city', e.target.value)} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>State</label>
                      <input className="profile-input" style={S.input} value={form.state} onChange={e => set('state', e.target.value)} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Pincode</label>
                      <input className="profile-input" style={S.input} value={form.pincode} onChange={e => set('pincode', e.target.value)} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Team Size</label>
                      <select className="profile-input profile-select" style={S.select} value={form.employee_count_range} onChange={e => set('employee_count_range', e.target.value)}>
                        {countRanges.map(r => <option key={r} value={r}>{r} employees</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '14px' }}>
                    <label style={S.label}>Business Description</label>
                    <textarea className="profile-input" style={{ ...S.input, resize: 'vertical', minHeight: '70px' }} value={form.business_description} onChange={e => set('business_description', e.target.value)} placeholder="Describe your business..." />
                  </div>
                </div>

                <div style={S.section}>
                  <div style={S.sectionTitle}>🏦 Banking Details</div>
                  <div style={S.grid}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>PAN Number</label>
                      <input className="profile-input" style={S.input} value={form.pan_number} onChange={e => set('pan_number', e.target.value)} placeholder="ABCDE1234F" maxLength={10} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>UPI ID</label>
                      <input className="profile-input" style={S.input} value={form.upi_id} onChange={e => set('upi_id', e.target.value)} placeholder="shop@okaxis" />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Account Name</label>
                      <input className="profile-input" style={S.input} value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Account Number</label>
                      <input className="profile-input" style={S.input} value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>IFSC Code</label>
                      <input className="profile-input" style={S.input} value={form.ifsc_code} onChange={e => set('ifsc_code', e.target.value)} placeholder="SBIN0001234" maxLength={11} />
                    </div>
                  </div>
                </div>
              </>
            )}


            {user.role === 'admin' && (
              <div style={S.section}>
                <div style={S.sectionTitle}>🪪 ID Verification</div>
                <div style={S.grid}>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>ID Proof Type</label>
                    <select className="profile-input profile-select" style={S.select} value={form.id_proof_type} onChange={e => set('id_proof_type', e.target.value)}>
                      {idProofTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>ID Number</label>
                    <input className="profile-input" style={S.input} value={form.id_proof_number} onChange={e => set('id_proof_number', e.target.value)} placeholder="ID number" />
                  </div>
                </div>
                {user.employer_id && (
                  <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(255,85,0,0.05)', borderRadius: '8px', border: '1px solid rgba(255,85,0,0.1)' }}>
                    <div style={{ color: '#555', fontSize: '11px', marginBottom: '4px' }}>EMPLOYER ID</div>
                    <div style={{ color: '#888', fontSize: '13px' }}>#{user.employer_id}</div>
                  </div>
                )}
              </div>
            )}


            {user.role === 'super_admin' && user.company_code && (
              <div style={S.section}>
                <div style={S.sectionTitle}>🔑 Company Code</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(255,85,0,0.06)', border: '1px solid rgba(255,85,0,0.2)', borderRadius: '10px' }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: '800', color: '#ff6622', letterSpacing: '0.1em' }}>{user.company_code}</code>
                  <span style={{ color: '#555', fontSize: '12px' }}>Share this with your employees to let them register</span>
                </div>
              </div>
            )}


            <div style={S.section}>
              <div style={S.sectionTitle}>🔒 Security</div>
              {!changingPwd ? (
                <button onClick={() => setChangingPwd(true)} style={{ ...S.cancelBtn, fontSize: '12px', padding: '8px 16px' }}>
                  🔑 Change Password
                </button>
              ) : (
                <div>
                  {pwdError && <div style={S.errorBanner}>❌ {pwdError}</div>}
                  {pwdSuccess && <div style={S.successBanner}>✅ {pwdSuccess}</div>}
                  <div style={{ ...S.grid1 }}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Current Password</label>
                      <input className="profile-input" style={S.input} type="password" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>New Password</label>
                      <input className="profile-input" style={S.input} type="password" value={pwd.newPwd} onChange={e => setPwd(p => ({ ...p, newPwd: e.target.value }))} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Confirm New Password</label>
                      <input className="profile-input" style={S.input} type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button onClick={handleChangePwd} style={{ ...S.saveBtn, padding: '9px 20px', fontSize: '12px' }}>Update Password</button>
                    <button onClick={() => { setChangingPwd(false); setPwdError(''); setPwd({ current: '', newPwd: '', confirm: '' }) }} style={{ ...S.cancelBtn, fontSize: '12px' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>


          <div style={S.footer}>
            <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
