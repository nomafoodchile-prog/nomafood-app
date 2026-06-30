'use client'
import { useState, useEffect, useCallback } from 'react'

type Locale = 'es' | 'en'

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>('es')
  const [t, setT] = useState<Record<string, any>>({})

  useEffect(() => {
    const stored = (localStorage.getItem('noma-locale') as Locale) || 'es'
    setLocale(stored)
    import(`../i18n/${stored}.json`).then(m => setT(m.default))
  }, [])

  const changeLocale = (l: Locale) => {
    localStorage.setItem('noma-locale', l)
    setLocale(l)
    import(`../i18n/${l}.json`).then(m => setT(m.default))
  }

  const translate = useCallback((key: string): string => {
    const parts = key.split('.')
    let val: any = t
    for (const p of parts) val = val?.[p]
    return val || key
  }, [t])

  return { t: translate, locale, changeLocale }
}
