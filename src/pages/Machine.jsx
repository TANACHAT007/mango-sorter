import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../contexts/I18nContext'
import { MACHINE } from '../config'

// renders exported from the Fusion model (copied into public/img by the project's build step)
const SHOTS = ['iso', 'cu_weigh', 'cu_tunnel_paddle', 'cu_inside_tunnel', 'cu_servo_mount', 'cu_cabinet_boards', 'cu_back_side', 'front']
const img = (n) => `${import.meta.env.BASE_URL}img/${n}.jpg`

export default function Machine() {
  const { t, lang } = useI18n()
  const [zoom, setZoom] = useState(null)
  const [missing, setMissing] = useState({})
  const shots = SHOTS.filter((s) => !missing[s])
  const specs = [
    ['spec_size', MACHINE.size], ['spec_belt', MACHINE.belt], ['spec_capacity', MACHINE.capacity],
    ['spec_weigh', t('spec_weigh_v')], ['spec_vision', t('spec_vision_v')], ['spec_ctrl', t('spec_ctrl_v')],
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">{t('machine_title')}</h1>
        <p className="muted">{MACHINE.name[lang]}</p>
      </div>

      {shots.length > 0 && (
        <button className="card overflow-hidden" onClick={() => setZoom(shots[0])}>
          <img src={img(shots[0])} alt="" className="max-h-[460px] w-full object-cover" onError={() => setMissing((m) => ({ ...m, [shots[0]]: true }))} />
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-lg">{t('machine_how')}</h2>
          <ol className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-500 text-sm font-semibold text-white">{n}</span>
                <span className="pt-0.5">{t('step' + n)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg">{t('specs')}</h2>
          {specs.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-black/5 py-2 last:border-0 dark:border-white/10">
              <span className="muted">{t(k)}</span><span className="text-right font-medium">{v}</span>
            </div>
          ))}
        </section>
      </div>

      {shots.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg">{t('gallery')}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {shots.slice(1).map((s) => (
              <motion.button key={s} whileHover={{ scale: 1.02 }} className="card overflow-hidden" onClick={() => setZoom(s)}>
                <img src={img(s)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" onError={() => setMissing((m) => ({ ...m, [s]: true }))} />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}
            className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/85 p-4">
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={img(zoom)} alt="" className="max-h-full max-w-full rounded-xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
