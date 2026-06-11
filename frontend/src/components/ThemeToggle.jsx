import React from 'react'

const ThemeToggle = ({ theme, toggleTheme }) => (
  <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
    <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
    <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
  </button>
)

export default ThemeToggle
