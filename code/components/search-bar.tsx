"use client"

import { Search, X, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { useTranslations } from "@/components/i18n-provider"

export default function SearchBar({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [showHelp, setShowHelp] = useState(false)
  // internal input value to debounce notifications to parent
  const [input, setInput] = useState(value)

  const t = useTranslations()

  // keep internal input in sync if parent changes externally
  useEffect(() => {
    setInput(value)
  }, [value])

  // debounce: notify parent after 250ms of inactivity
  useEffect(() => {
    const id = setTimeout(() => {
      if (input !== value) onChange(input)
    }, 250)
    return () => clearTimeout(id)
  }, [input, onChange, value])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('search.bar.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-10 pr-10 bg-card border-border text-base"
        />
        {input && (
          <button
            onClick={() => setInput("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <HelpCircle className="w-4 h-4" />
          {t('search.bar.help_button')}
        </button>
      </div>

      {showHelp && (
        <div className="text-xs bg-muted/50 border border-border rounded-md p-3 text-muted-foreground space-y-1">
          <p>
            <strong>{t('search.bar.help.multiple_words.title')}</strong> {t('search.bar.help.multiple_words.description')}
          </p>
          <p>
            <strong>{t('search.bar.help.any_word.title')}</strong> {t('search.bar.help.any_word.description')}
          </p>
        </div>
      )}
    </div>
  )
}
