"use client"

import React, { createContext, useContext, useState } from 'react'

type LocaleContextShape = { locale: string; setLocale: (l: string) => void }
const LocaleContext = createContext<LocaleContextShape | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>('de')
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export default LocaleProvider


