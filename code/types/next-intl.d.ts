declare module 'next-intl' {
  import type { ComponentType, ReactNode } from 'react'

  export const NextIntlProvider: ComponentType<{
    locale: string
    messages?: Record<string, string>
    children?: ReactNode
  }>

  export function useTranslations(namespace?: string): (key: string) => string
}

declare module 'next-intl/server' {
  export function createTranslator(messages: Record<string, string>): (key: string) => string
}
