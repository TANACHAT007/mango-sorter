import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useI18n } from '../contexts/I18nContext'
import { cropSrc, demoCropSvg, useVision } from '../services/visionData'
import { sizeGrade } from '../config'
import { ClassBadge } from '../components/Charts'

export default function Camera() {
  const { current, demo } = useData()
  const { t, fmt, fmtTime } = useI18n()
  const { crops, frame } = useVision(current?.id)
  const [now, setNow] = useState(Date.now())
  const [zoom, setZoom] = useState(null)
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i) }, [])
  const list = useMemo(() => Object.entries(crops).sort((a, b) => b[1].t - a[1].t).slice(0, 36), [crops])
  const age = frame?.t ? Math.max(0, Math.round((now - frame.t) / 1000)) : null
  const liveOk = age !== null && age < 10
  const newest = list[0]?.[1]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">{t('cam_title')}</h1>
        <p className="muted text-sm">{t('cam_sub')}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card overflow-hidden lg:col-span-3">
          <div className="relative grid aspect-video place-items-center bg-black">
            {frame?.jpg && <img src={'data:image/jpeg;base64,' + frame.jpg} alt="" className="h-full w-full object-contain" />}
            {!frame?.jpg && demo && newest && <img src={demoCropSvg(newest.c, newest.t % 100000, 480, 270)} alt="" className="h-full w-full object-cover opacity-90" />}
            {!frame?.jpg && !(demo && newest) && <div className="px-6 text-center text-sm text-stone-300">{t('cam_none')}</div>}
            <span className={`chip absolute left-3 top-3 ${liveOk ? 'bg-red-600 text-white' : 'bg-stone-700/80 text-stone-200'}`}>
              {liveOk && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
              {demo && !frame ? t('cam_sample') : liveOk ? t('live') : t('cam_stale')}
            </span>
            {frame?.t && <span className="chip absolute bottom-3 right-3 bg-black/60 text-stone-100">{fmtTime(frame.t, false)}{age !== null ? ` · ${age}s` : ''}</span>}
          </div>
          <p className="muted px-4 py-3 text-xs">{t('cam_note')}</p>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg">{t('cam_latest')}</h2>
          {newest ? (
            <div>
              <img src={cropSrc(newest)} alt="" className="w-full rounded-xl border border-black/5 bg-stone-100 object-contain dark:border-white/10" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ClassBadge c={newest.c} />
                <span className="muted text-sm">{t('confidence')} {fmt((newest.conf || 0) * 100)}%</span>
                {newest.g != null && <><b className="num ml-auto">{fmt(newest.g)} {t('g')}</b><span className="chip bg-black/5 dark:bg-white/10">{sizeGrade(newest.g)}</span></>}
              </div>
              <div className="muted mt-1 text-xs">{fmtTime(newest.t)} · {t('cam_src_' + (newest.src || 'hsv'))}</div>
            </div>
          ) : <div className="muted py-10 text-center text-sm">—</div>}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg">{t('cam_history')}</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          <AnimatePresence initial={false}>
            {list.map(([k, c]) => (
              <motion.button key={k} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card overflow-hidden text-left" onClick={() => setZoom(c)}>
                <img src={cropSrc(c)} alt="" loading="lazy" className="aspect-[4/3] w-full bg-stone-100 object-cover" />
                <div className="flex items-center gap-1 px-2 py-1.5"><ClassBadge c={c.c} />{c.g != null && <span className="num ml-auto text-xs">{fmt(c.g)}</span>}</div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
        {!list.length && <div className="card muted p-10 text-center text-sm">{t('cam_no_crops')}</div>}
      </section>

      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)} className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/85 p-4">
            <img src={cropSrc(zoom)} alt="" className="max-h-full w-full max-w-xl rounded-xl bg-stone-100" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
