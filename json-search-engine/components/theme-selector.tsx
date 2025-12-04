"use client"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "./theme-provider"
import { Palette } from "lucide-react"

const themes = [
  { id: "midnight", name: "Midnight", color: "#1e293b" },
  { id: "aurora", name: "Aurora", color: "#0f766e" },
  { id: "sunset", name: "Sunset", color: "#7c2d12" },
  { id: "forest", name: "Forest", color: "#14532d" },
  { id: "ocean", name: "Ocean", color: "#0c2340" },
  { id: "synthwave", name: "Synthwave", color: "#4c1d95" },
]

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (!mounted) return null

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId as any)
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" ref={containerRef}>
      <div className="relative">
        <button
          onClick={handleToggle}
          className="theme-toggle-btn w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 relative z-[9999]"
        >
          <Palette className="w-6 h-6 text-white" />
        </button>

        {isOpen && (
          <div className="absolute bottom-20 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 gap-3 flex flex-col opacity-100 transition-all duration-200 min-w-max animate-fadeIn-up pointer-events-auto relative z-[10000]">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeSelect(t.id)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 theme-option ${
                  theme === t.id
                    ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/50"
                    : "hover:bg-slate-800"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-white transition-transform duration-200 theme-color-dot"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-sm font-medium text-white">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
