'use client'

import React, { useEffect, useState } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('debug-theme')

export default function DebugThemeBadge() {
  const [rootClass, setRootClass] = useState<string>('')
  const [stored, setStored] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      setRootClass(document.documentElement.className || '(none)')
      setStored(localStorage.getItem('theme'))
    }
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [])

  const applyTheme = (theme: string | null) => {
    try {
      if (theme === null) {
        localStorage.removeItem('theme')
        // remove known classes
        document.documentElement.classList.remove('dark', 'default')
        setRootClass(document.documentElement.className || '(none)')
        setStored(null)
        return
      }
      localStorage.setItem('theme', theme)
      document.documentElement.classList.remove('dark', 'default')
      document.documentElement.classList.add(theme)
      document.documentElement.setAttribute('data-theme', theme)
      setRootClass(document.documentElement.className || '(none)')
      setStored(localStorage.getItem('theme'))
    } catch (e) {
      log.error('APPLY-THEME-FAILED', e)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      left: 8,
      bottom: 12,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '8px 10px',
      borderRadius: 8,
      fontSize: 12,
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)'
    }}>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>Theme debug</div>
      <div style={{ marginBottom: 4 }}>root.class: <code style={{ fontFamily: 'monospace' }}>{rootClass}</code></div>
      <div style={{ marginBottom: 8 }}>localStorage.theme: <code style={{ fontFamily: 'monospace' }}>{String(stored)}</code></div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => applyTheme('default')} style={{ padding: '4px 8px' }}>default</button>
        <button onClick={() => applyTheme('dark')} style={{ padding: '4px 8px' }}>dark</button>
        <button onClick={() => applyTheme(null)} style={{ padding: '4px 8px' }}>clear</button>
      </div>
    </div>
  )
}
