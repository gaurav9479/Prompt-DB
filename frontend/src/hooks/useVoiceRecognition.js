import { useState, useEffect, useRef, useCallback } from 'react'

const ERROR_MESSAGES = {
  'network':       '🌐 No internet or Google speech servers unreachable. Check your connection.',
  'not-allowed':   '🔒 Microphone access denied. Allow mic in browser settings.',
  'no-speech':     '🔇 No speech detected. Try speaking louder.',
  'audio-capture': '🎤 No microphone found. Please connect a mic.',
  'aborted':       null, // user-triggered, no message needed
}


/**
 * useVoiceRecognition
 * @param {Function} onTranscript - called with the final spoken text to populate the command input.
 */
export const useVoiceRecognition = (onTranscript) => {
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)       // human-readable error string or null
  const recognitionRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)
  const isLockedRef = useRef(false)              // prevents overlapping start calls
  const cooldownRef = useRef(null)               // timeout handle for error cooldown

  // keep ref in sync so the recognition callback always sees the latest setter
  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.log('🎤 Speech recognition not supported in this browser')
      setVoiceSupported(false)
      return
    }

    setVoiceSupported(true)
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-IN'  // supports Hinglish + English

    recognition.onstart = () => {
      console.log('🎤 Recognition started')
      setIsListening(true)
      setError(null)
      setTranscript('')
    }

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      const spoken = finalText || interimText
      setTranscript(spoken)

      // pipe final text into the command input
      if (finalText && onTranscriptRef.current) {
        onTranscriptRef.current(finalText.trim())
      }
    }

    recognition.onerror = (event) => {
      console.error('🎤 Error:', event.error)
      const msg = ERROR_MESSAGES[event.error] ?? `🎤 Error: ${event.error}`
      if (msg) setError(msg)
      setIsListening(false)
      isLockedRef.current = false

      // clear error message after 4 seconds
      clearTimeout(cooldownRef.current)
      if (msg) {
        cooldownRef.current = setTimeout(() => setError(null), 4000)
      }
    }

    recognition.onend = () => {
      console.log('🎤 Recognition ended')
      setIsListening(false)
      isLockedRef.current = false
    }

    recognitionRef.current = recognition

    return () => {
      clearTimeout(cooldownRef.current)
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isLockedRef.current) return
    isLockedRef.current = true
    setTranscript('')
    setError(null)
    try {
      recognitionRef.current.start()
    } catch (err) {
      console.error('🎤 Start failed:', err)
      isLockedRef.current = false
      if (err.name === 'InvalidStateError') {
        // already running — just mark it
        setIsListening(true)
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    voiceSupported,
    transcript,
    error,          // show this string near the mic button when non-null
    startListening,
    stopListening,
    toggleListening,
  }
}
