import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import { useData } from '../contexts/DataContext'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const ICONS = {
  dash: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  lots: 'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10',
  machine: 'M3 16h18M5 16V9h10l4 3v4M7 20a2 2 0 100-4 2 2 0 000 4zM17 20a2 2 0 100-4 2 2 0 000 4z',
  cam: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  train: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-7',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6L4.5 4.5M19.5 19.5L18 18M6 18l-1.5 1.5M19.5 4.5L18 6M12 16a4 4 0 100-8 4 4 0 000 8z',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
}
const NAV = [
  { to: '/', key: 'nav_dashboard', icon: 'dash', end: true },
  { to: '/lots', key: 'nav_lots', icon: 'lots' },
  { to: '/camera', key: 'nav_camera', icon: 'cam' },
  { to: '/3d', key: 'nav_3d', icon: 'cube' },
  { to: '/train', key: 'nav_train', icon: 'train' },
  { to: '/machine', key: 'nav_machine', icon: 'machine' },
]

export function Logo({ size = 36 }) {
  return <img src={import.meta.env.BASE_URL + 'favicon.svg'} width={size} height={size} alt="" className="rounded-xl" />
}

function Controls() {
  const { lang, toggle: toggleLang, t } = useI18n()
  const { dark, toggle } = useTheme()
  return (
    <div className="flex items-center gap-1">
      <button className="btn-ghost !px-2.5 text-sm" onClick={toggleLang} aria-label={t('language')}>{lang === 'th' ? 'EN' : 'ไทย'}</button>
      <button className="btn-ghost !px-2.5" onClick={toggle} aria-label={t('theme')}><Icon d={dark ? ICONS.sun : ICONS.moon} /></button>
    </div>
  )
}

function InstallPrompt() {
  const { t } = useI18n()
  const [evt, setEvt] = useState(null)
  useEffect(() => {
    const h = (e) => {
      e.preventDefault()
      let dismissed = false
      try { dismissed = localStorage.getItem('a2hs') === 'no' } catch { /* ignore */ }
      if (!dismissed) setEvt(e)
    }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  if (!evt) return null
  const close = () => { try { localStorage.setItem('a2hs', 'no') } catch { /* ignore */ } setEvt(null) }
  return (
    <div className="no-print card fixed inset-x-4 bottom-20 z-40 flex items-center gap-3 p-3 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96">
      <Logo />
      <div className="min-w-0 flex-1"><div className="font-medium">{t('install')}</div><div className="muted truncate text-sm">{t('install_hint')}</div></div>
      <button className="btn-ghost text-sm" onClick={close}>{t('later')}</button>
      <button className="btn-primary text-sm" onClick={() => { evt.prompt(); setEvt(null) }}>{t('install')}</button>
    </div>
  )
}

export default function Layout({ children }) {
  const { t } = useI18n()
  const { demo } = useData()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const link = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${isActive
    ? 'bg-primary-500 text-white shadow-soft' : 'text-ink-700 hover:bg-black/5 dark:text-stone-200 dark:hover:bg-white/10'}`
  return (
    <div className="min-h-screen lg:pl-64">
      {/* sidebar (desktop) */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-black/5 bg-white p-4 dark:border-white/10 dark:bg-ink-800 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-1">
          <Logo size={42} />
          <div><div className="text-lg font-semibold leading-tight">{t('appName')}</div><div className="muted text-xs">{t('tagline')}</div></div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}><Icon d={ICONS[n.icon]} />{t(n.key)}</NavLink>)}
        </nav>
        <div className="muted mt-auto px-1 text-xs">v3 · 2020 frame · ESP32 + Raspberry Pi 5</div>
      </aside>

      {/* top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-surface/85 px-4 py-2.5 backdrop-blur dark:border-white/10 dark:bg-ink-900/85">
        <div className="flex items-center gap-2 lg:hidden"><Logo size={32} /><span className="font-semibold">{t('appName')}</span></div>
        <div className="ml-auto"><Controls /></div>
      </header>
      {demo && <div className="no-print bg-primary-100 px-4 py-2 text-center text-sm text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">{t('demo_banner')}</div>}
      {!online && <div className="no-print bg-stone-700 px-4 py-2 text-center text-sm text-white">{t('offline')}</div>}

      <main className="print-area mx-auto max-w-6xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10">{children}</main>

      {/* bottom nav (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-ink-800/95 lg:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium leading-tight ${isActive ? 'text-primary-600 dark:text-primary-300' : 'muted'}`}>
            <Icon d={ICONS[n.icon]} />{t(n.key)}
          </NavLink>
        ))}
      </nav>
      <InstallPrompt />
    </div>
  )
}
