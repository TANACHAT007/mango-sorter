import { CLASSES } from '../config'
import { useI18n } from '../contexts/I18nContext'

export function Stat({ label, value, unit, accent }) {
  return (
    <div className="card p-4">
      <div className="muted text-sm">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`num text-3xl font-semibold ${accent ? 'text-primary-600 dark:text-primary-300' : ''}`}>{value}</span>
        {unit && <span className="muted text-sm">{unit}</span>}
      </div>
    </div>
  )
}

export function ClassBadge({ c }) {
  const { t } = useI18n()
  const cls = CLASSES.find((x) => x.key === c)
  return (
    <span className="chip" style={{ background: (cls?.color || '#888') + '22', color: cls?.color || '#888' }}>
      <span className="h-2 w-2 rounded-full" style={{ background: cls?.color || '#888' }} />{t('class_' + c)}
    </span>
  )
}

// counts + weight per outlet, as horizontal bars
export function ClassBars({ byClass, total }) {
  const { t, fmt } = useI18n()
  return (
    <div className="flex flex-col gap-3">
      {CLASSES.map((c) => {
        const v = byClass[c.key] || { n: 0, g: 0 }
        const pct = total ? (v.n / total) * 100 : 0
        return (
          <div key={c.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{t('class_' + c.key)} <span className="muted font-normal">· {t('outlet', { o: c.outlet })}</span></span>
              <span className="num"><b>{fmt(v.n)}</b> {t('fruits')} · {fmt(v.g / 1000, 2)} {t('kg')} · {fmt(pct, 1)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: c.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// weight histogram (50 g bins) drawn as plain SVG — prints crisply on the lot report
export function Histogram({ bins, height = 150 }) {
  const { t } = useI18n()
  const max = Math.max(1, ...bins.map((b) => b.n))
  const w = 100 / bins.length
  return (
    <div>
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={t('weight_dist')}>
        {bins.map((b, i) => {
          const h = (b.n / max) * (height / 3 - 2)
          return <rect key={b.from} x={i * w + 0.6} y={height / 3 - h} width={w - 1.2} height={h} rx="0.8" fill="#e89a00" opacity={b.n ? 0.9 : 0.15} />
        })}
      </svg>
      <div className="muted mt-1 grid text-[11px]" style={{ gridTemplateColumns: `repeat(${bins.length}, 1fr)` }}>
        {bins.map((b, i) => <span key={b.from} className="text-center">{i % 2 === 0 ? b.from : ''}</span>)}
      </div>
      <div className="muted text-center text-[11px]">{t('g')}</div>
    </div>
  )
}
