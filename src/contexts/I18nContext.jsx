import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { translations } from '../i18n/translations'

const Ctx = createContext({ lang: 'th', t: (k) => k, toggle: () => {} })

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lang') || 'th' } catch { return 'th' }
  })
  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem('lang', lang) } catch { /* ignore */ }
  }, [lang])
  const t = useCallback((key, vars) => {
    let s = translations[lang]?.[key] ?? translations.th[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
    return s
  }, [lang])
  const fmt = useCallback((n, digits = 0) => Number(n ?? 0).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US',
    { minimumFractionDigits: digits, maximumFractionDigits: digits }), [lang])
  const fmtTime = useCallback((ms, withDate = true) => (ms ? new Date(ms).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB',
    withDate ? { dateStyle: 'medium', timeStyle: 'short' } : { timeStyle: 'medium' }) : '—'), [lang])
  return <Ctx.Provider value={{ lang, t, fmt, fmtTime, toggle: () => setLang((l) => (l === 'th' ? 'en' : 'th')) }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
