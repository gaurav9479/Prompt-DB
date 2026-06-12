import { useState, useEffect, useRef, useCallback } from 'react'

export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.log('Speech recognition not supported')
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    const recognition = new SpeechRecognition()


    recognition.continuous = false  
    recognition.interimResults = true
    recognition.lang = 'en-IN'  

    recognition.onstart = () => {
      console.log('🎤 Recognition started')
      setIsListening(true)
      setError(null)
      setTranscript('')
    }

    recognition.onresult = (event) => {
      console.log('🎤 Got result:', event.results)
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


      setTranscript(finalText || interimText)
      console.log('🎤 Transcript:', finalText || interimText)
    }

    recognition.onerror = (event) => {
      console.error('🎤 Error:', event.error)
      setError(event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('🎤 Recognition ended')
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.log('🎤 Recognition not available')
      return
    }


    setTranscript('')
    setError(null)

    try {
      recognitionRef.current.start()
      console.log('🎤 Starting...')
    } catch (err) {
      console.error('🎤 Start failed:', err)

      if (err.name === 'InvalidStateError') {
        recognitionRef.current.stop()
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
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening
  }
}
