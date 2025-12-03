"use client"

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react'
import { useAppState } from '@/hooks/use-app-state'
import { createLogger } from '@/lib/logger'

const log = createLogger('i18n')

type Messages = Record<string, string>

const I18nContext = createContext<{ locale: string; messages: Messages }>({ locale: 'pt-BR', messages: {} })

const loadMessages = async (locale: string) => {
  try {
    const messages = (await import(`@/locales/${locale}.json`)).default
    return messages
  } catch (e) {
    log.error('LOAD-MESSAGES-FAILED', e)
    return {}
  }
}

export function ClientI18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useAppState()
  const [messages, setMessages] = React.useState<Messages>({})

  useEffect(() => {
    // Load messages for the selected locale and update state so consumers re-render.
    loadMessages(locale).then(setMessages)
  }, [locale])

  // Ensure document <html> lang attribute is updated on locale change so
  // Intl APIs and any code that reads document.documentElement.lang get a valid value.
  useEffect(() => {
    try {
      if (typeof document !== 'undefined' && locale) {
        document.documentElement.lang = locale
        document.documentElement.setAttribute('lang', locale)
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [locale])

  const value = useMemo(() => {
    log.debug('CREATE-CONTEXT', {
      locale,
      messageCount: Object.keys(messages || {}).length
    })
    return { locale, messages }
  }, [locale, messages])

  useEffect(() => {
    log.debug('PROVIDER-UPDATED', {
      locale,
      messageCount: Object.keys(messages || {}).length
    })
  }, [locale, messages])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslations() {
  const ctx = useContext(I18nContext)
  
  if (!ctx) {
    log.error('NO-CONTEXT', null)
    return (k: string) => k
  }

  return (key: string, params?: Record<string, any>) => {
    // support nested keys with dot
    const parts = key.split('.')
    let cur: any = ctx.messages
    
    // Debug log para mensagens no primeiro uso
    if (!('__logged' in ctx)) {
      log.debug('INITIAL-MESSAGES', {
        locale: ctx.locale,
        keyCount: Object.keys(ctx.messages || {}).length
      })
      ;(ctx as any).__logged = true
    }

    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p]
      } else {
        log.warn('MISSING-TRANSLATION', {
          key,
          part: p,
          locale: ctx.locale
        })
        return key
      }
    }
    
    if (typeof cur === 'string' && params) {
      return cur.replace(/\{(\w+)\}/g, (match, key) => {
        return String(params[key] ?? match)
      })
    }
    
    return typeof cur === 'string' ? cur : key
  }
}

export function useLocale() {
  const { locale } = useAppState()
  return locale
}

export default ClientI18nProvider
