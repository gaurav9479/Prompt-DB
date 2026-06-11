export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0

  // Length checks
  if (password.length >= 6) score += 1
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  // Map score to strength level
  if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' }
  if (score <= 4) return { score: 2, label: 'Fair', color: '#f97316' }
  if (score <= 5) return { score: 3, label: 'Good', color: '#eab308' }
  if (score <= 6) return { score: 4, label: 'Strong', color: '#22c55e' }
  return { score: 5, label: 'Very Strong', color: '#10b981' }
}
