import React from 'react'

const VoiceButton = ({ isListening, isSupported, onClick, disabled }) => {
  if (!isSupported) return null

  return (
    <button
      type="button"
      className={`voice-btn ${isListening ? 'listening' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={isListening ? 'Listening... (click to stop)' : 'Click to speak (Hindi/English)'}
    >
      {isListening ? (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
      ) : (

        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      )}
      {isListening && <span className="voice-pulse"></span>}
    </button>
  )
}

export default VoiceButton
