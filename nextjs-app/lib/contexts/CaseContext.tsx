"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { getCases as fetchCases } from '../../app/dashboard/faelle/services/caseService'

type CaseType = any

type CaseContextValue = {
  cases: CaseType[]
  loading: boolean
  refreshCases: () => Promise<void>
}

const CaseContext = createContext<CaseContextValue | undefined>(undefined)

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<CaseType[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCases = useCallback(async () => {
    setLoading(true)
    const res = await fetchCases()
    if (res.erfolg) setCases(res.faelle)
    setLoading(false)
  }, [])

  return <CaseContext.Provider value={{ cases, loading, refreshCases }}>{children}</CaseContext.Provider>
}

export function useCase() {
  const ctx = useContext(CaseContext)
  if (!ctx) throw new Error('useCase must be used within CaseProvider')
  return ctx
}


