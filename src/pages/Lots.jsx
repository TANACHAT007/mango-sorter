import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useI18n } from '../contexts/I18nContext'

export default function Lots() {
  const { list } = useData()
  const { t, fmtTime } = useI18n()
  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('lots_title')}</h1>
      {!list.length && <div className="card muted p-10 text-center">{t('lots_empty')}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((l) => (
          <motion.div key={l.id} whileHover={{ y: -2 }}>
            <Link to={'/lot/' + l.id} className="card block p-4 transition hover:border-primary-400">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-xl dark:bg-primary-900/40">🥭</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.name || l.id}</div>
                  <div className="muted truncate text-sm">{l.id}{l.variety ? ' · ' + l.variety : ''}</div>
                  <div className="muted mt-1 text-xs">{fmtTime(l.started)}</div>
                </div>
                <span className={`chip ${l.ended ? 'bg-black/5 dark:bg-white/10' : 'bg-leaf-500/15 text-leaf-600 dark:text-leaf-400'}`}>
                  {l.ended ? t('lot_closed') : t('lot_open')}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
