import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useI18n } from '../contexts/I18nContext'
import { lotStats } from '../services/stats'
import { sizeGrade } from '../config'
import { ClassBadge, ClassBars, Histogram, Stat } from '../components/Charts'

const STATE_STYLE = {
  running: 'bg-leaf-500/15 text-leaf-600 dark:text-leaf-400',
  idle: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  estop: 'bg-red-500/15 text-red-600 dark:text-red-300',
  offline: 'bg-stone-500/15 text-stone-500',
}

export default function Dashboard() {
  const { current, items, status, ready, watchLot } = useData()
  const { t, fmt, fmtTime } = useI18n()
  useEffect(() => { if (current) watchLot(current.id) }, [current, watchLot])
  const st = useMemo(() => lotStats(current ? items[current.id] : {}), [current, items])
  // the machine counts as offline when its heartbeat is older than 2 minutes
  const state = status?.updated && Date.now() - status.updated < 120000 ? status.state || 'idle' : 'offline'

  if (!ready) return <div className="muted py-20 text-center">…</div>
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="muted text-sm">{t('current_lot')}</div>
          <h1 className="text-2xl">{current ? current.name || current.id : t('no_lot')}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`chip ${STATE_STYLE[state]}`}>
            {state === 'running' && <span className="h-2 w-2 animate-pulse rounded-full bg-current" />}
            {t('status_' + state)}
          </span>
          {current && <Link to={'/lot/' + current.id} className="btn-primary text-sm">{t('view_report')}</Link>}
        </div>
      </div>
      {status?.updated && <div className="muted -mt-3 text-xs">{t('last_seen', { t: fmtTime(status.updated, false) })}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('total_fruits')} value={fmt(st.n)} unit={t('fruits')} />
        <Stat label={t('total_weight')} value={fmt(st.total / 1000, 2)} unit={t('kg')} accent />
        <Stat label={t('avg_weight')} value={fmt(st.mean)} unit={t('g')} />
        <Stat label={t('rate')} value={fmt(st.rate, 1)} unit={t('per_min')} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-lg">{t('by_class')}</h2>
          <ClassBars byClass={st.byClass} total={st.n} />
          <h2 className="mb-2 mt-7 text-lg">{t('weight_dist')}</h2>
          <Histogram bins={st.bins} />
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg">{t('recent')}</h2>
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {st.recent.map((i) => (
                <motion.li key={i.t + '-' + i.g} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 border-b border-black/5 py-2 last:border-0 dark:border-white/10">
                  <span className="muted num w-16 text-xs">{fmtTime(i.t, false)}</span>
                  <ClassBadge c={i.c} />
                  <span className="num ml-auto font-semibold">{fmt(i.g)} {t('g')}</span>
                  <span className="chip bg-black/5 dark:bg-white/10">{sizeGrade(i.g)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {!st.recent.length && <li className="muted py-8 text-center text-sm">—</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
