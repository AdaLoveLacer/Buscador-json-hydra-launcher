"use client"

import { Button } from "./ui/button"
import { useAppState } from "@/hooks/use-app-state"

export function LanguageSelector() {
  const { locale, setLocale } = useAppState()

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale)
    // Não recarregamos mais a página — o ClientI18nProvider carrega as mensagens dinamicamente
    // e atualiza o contexto. Também atualizamos o `html` lang no provider para manter
    // compatibilidade com APIs que leem document.documentElement.lang.
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant={locale === 'pt-BR' ? 'default' : 'outline'}
        onClick={() => handleLanguageChange('pt-BR')}
        className="hover:bg-primary/90"
      >
        PT
      </Button>
      <Button
        variant={locale === 'en' ? 'default' : 'outline'} 
        onClick={() => handleLanguageChange('en')}
        className="hover:bg-primary/90"
      >
        EN
      </Button>
    </div>
  )
}