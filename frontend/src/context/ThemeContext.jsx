import React, { createContext, useState, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
    const [colorTheme, setColorTheme] = useState('black-orange')

    useEffect(() => {
        document.documentElement.setAttribute('data-color-theme', 'black-orange')
        localStorage.setItem('promptdb_color_theme', 'black-orange')
    }, [])

    return (
        <ThemeContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
