"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "midnight" | "aurora" | "sunset" | "forest" | "ocean" | "synthwave"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("midnight")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("json-search-theme") as Theme | null
    if (stored) {
      setTheme(stored)
      document.documentElement.setAttribute("data-theme", stored)
    } else {
      document.documentElement.setAttribute("data-theme", "midnight")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("json-search-theme", theme)
      document.documentElement.setAttribute("data-theme", theme)
    }
  }, [theme, mounted])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
