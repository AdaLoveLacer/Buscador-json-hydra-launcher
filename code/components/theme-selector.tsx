"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { useTheme } from 'next-themes'
import { useTranslations } from '@/components/i18n-provider'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Mark mounted to avoid theme mismatches / hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const t = useTranslations()

  const options = [
    { id: 'default', label: t('theme.default') },
    { id: 'dark', label: t('theme.dark') },
  ]

  return (
    <div className="relative inline-block">
      {/*
        Render a non-interactive placeholder on the server / initial hydration
        to avoid hydration mismatches caused by theme values that are only
        available on the client (next-themes). After mount we render the
        interactive DropdownMenu.
      */}
      {!mounted ? (
        <Button variant="outline" size="sm">{t('theme.button')}</Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {t('theme.button')}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={6}>
            <div className="flex flex-col p-1">
              {options.map((o) => (
                <DropdownMenuItem
                  key={o.id}
                  onSelect={() => setTheme(o.id)}
                  className={`${theme === o.id ? 'font-semibold bg-accent/10' : ''}`}
                >
                  {o.label}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
