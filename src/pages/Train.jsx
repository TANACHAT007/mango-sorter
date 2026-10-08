import { useEffect, useMemo, useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useI18n } from '../contexts/I18nContext'
import { useAdmin } from '../contexts/AdminContext'
import { cropSrc, useVision } from '../services/visionData'
import { CLASS_KEYS, trainModel } from '../services/softmax'
import { CLASSES } from '../config'
import { ClassBadge } from '../components/Charts'

const COLOR = Object.fromEntries(CLASSES.map((c) => [c.key, c.color]))
const MIN_PER_CLASS = 8

function AdminBox() {
  const { t } = useI18n()
  const { uid, isAdmin, requested, busy, signIn, request, signOut, available } = useAdmin()
  const { demo } = useData()
  const [name, setName] = useState('')
  if (demo || !available) return <div className="card p-4 text-sm"><b>{t('adm_demo_t')}</b><p className="muted mt-1">{t('adm_demo')}</p></div>
  if (!uid) return (
    <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
      <div className="min-w-0 flex-1"><b>{t('adm_view_t')}</b><p className="muted">{t('adm_view')}</p></div>
      <button className="btn-primary" disabled={busy} onClick={signIn}>{t('adm_signin')}</button>
    </div>
  )
  if (isAdmin) return (
    <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
      <span className="chip bg-leaf-500/15 text-leaf-600 dark:text-leaf-400">{t('adm_ok')}</span>
      <span className="muted min-w-0 flex-1 truncate">{t('adm_device')}: {uid}</span>
      <button className="btn-ghost" onClick={signOut}>{t('adm_signout')}</button>
    </div>
  )
  return (
    <div className="card p-4 text-sm">
      <b>{t('adm_wait_t')}</b>
      <p className="muted mt-1">{t('adm_wait')}</p>
      <div className="mt-2 select-all break-all rounded-lg bg-black/5 px-3 py-2 font-mono text-xs dark:bg-white/10">{uid}</div>
      {!requested ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t('adm_name')}
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-ink-900" />
          <button className="btn-primary" disabled={!name.trim()} onClick={() => request(name.trim())}>{t('adm_request')}</button>
        </div>
      ) : <p className="mt-3 text-primary-700 dark:text-primary-300">{t('adm_requested')}</p>}
      <button className="btn-ghost mt-2 !px-0 text-xs" onClick={signOut}>{t('adm_signout')}</button>
    </div>
  )
}

export default function Train() {
  const { list, current, demo } = useData()
  const { t, fmt, fmtTime } = useI18n()
  const { isAdmin } = useAdmin()
  const [lotId, setLotId] = useState(null)
  useEffect(() => { if (!lotId && current) setLotId(current.id) }, [current, lotId])
  const { crops, labels, model, saveLabel, publishModel } = useVision(lotId)
  const [filter, setFilter] = useState('unlabelled')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const canEdit = demo || isAdmin

  const rows = useMemo(() => Object.entries(crops).sort((a, b) => b[1].t - a[1].t), [crops])
  const labelled = rows.filter(([k, c]) => labels[k] && labels[k].c !== 'skip' && Array.isArray(c.f))
  const counts = Object.fromEntries(CLASS_KEYS.map((k) => [k, labelled.filter(([key]) => labels[key].c === k).length]))
  const fvs = [...new Set(labelled.map(([, c]) => c.fv))]
  const ready = CLASS_KEYS.every((k) => counts[k] >= MIN_PER_CLASS) && fvs.length === 1
  const shown = rows.filter(([k, c]) => {
    const l = labels[k]?.c
    if (filter === 'unlabelled') return !l
    if (filter === 'changed') return l && l !== 'skip' && l !== c.c
    if (filter === 'all') return true
    return l === filter
  }).slice(0, 96)

  const setLabel = async (key, c) => {
    if (!canEdit) return
    try { await saveLabel(key, labels[key]?.c === c ? null : c) } catch { setMsg(t('trn_save_err')) }
  }
  const acceptShown = async () => {
    for (const [k, c] of shown) if (!labels[k]) await saveLabel(k, c.c)
  }
  const train = () => {
    setBusy(true); setMsg('')
    setTimeout(() => {                                   // let the button repaint before the (short) blocking computation
      try {
        setResult(trainModel(labelled.map(([k, c]) => ({ f: c.f, c: labels[k].c })), fvs[0]))
      } catch (e) { setMsg(String(e.message || e)) }
      setBusy(false)
    }, 30)
  }
  const publish = async () => {
    if (!result || demo || !isAdmin) return
    setBusy(true)
    try { const v = await publishModel(result.model); setMsg(t('trn_published', { v })) } catch { setMsg(t('trn_pub_err')) }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">{t('trn_title')}</h1>
        <p className="muted text-sm">{t('trn_sub')}</p>
      </div>
      <AdminBox />

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg">{t('trn_step1')}</h2>
            <select value={lotId || ''} onChange={(e) => { setLotId(e.target.value); setResult(null) }}
              className="ml-auto max-w-[55%] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-ink-900">
              {list.map((l) => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}
            </select>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5 text-sm">
            {['unlabelled', 'changed', ...CLASS_KEYS, 'skip', 'all'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 ${filter === f ? 'bg-primary-500 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
                {CLASS_KEYS.includes(f) ? t('class_' + f) : t('trn_f_' + f)}
              </button>
            ))}
            {canEdit && filter === 'unlabelled' && shown.length > 0 && <button className="btn-ghost ml-auto !py-1 text-sm" onClick={acceptShown}>{t('trn_accept', { n: shown.length })}</button>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map(([k, c]) => {
              const l = labels[k]?.c
              return (
                <div key={k} className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10" style={l && l !== 'skip' ? { borderColor: COLOR[l], borderWidth: 2 } : undefined}>
                  <img src={cropSrc(c)} alt="" loading="lazy" className={`aspect-[4/3] w-full bg-stone-100 object-cover ${l === 'skip' ? 'opacity-40' : ''}`} />
                  <div className="flex items-center gap-1 px-2 pt-1.5 text-xs"><span className="muted">{t('trn_machine')}</span><ClassBadge c={c.c} /><span className="muted ml-auto">{fmt((c.conf || 0) * 100)}%</span></div>
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {CLASS_KEYS.map((ck) => (
                      <button key={ck} disabled={!canEdit} title={t('class_' + ck)} onClick={() => setLabel(k, ck)}
                        className="h-7 rounded-md text-[11px] font-semibold text-white transition disabled:cursor-not-allowed"
                        style={{ background: COLOR[ck], opacity: l === ck ? 1 : 0.28 }}>{t('class_' + ck).slice(0, 2)}</button>
                    ))}
                    <button disabled={!canEdit} title={t('trn_f_skip')} onClick={() => setLabel(k, 'skip')}
                      className={`h-7 rounded-md text-[11px] font-semibold ${l === 'skip' ? 'bg-stone-600 text-white' : 'bg-black/10 dark:bg-white/15'}`}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
          {!shown.length && <div className="muted py-10 text-center text-sm">{rows.length ? t('trn_none_filter') : t('trn_none')}</div>}
        </section>

        <div className="flex flex-col gap-5">
          <section className="card p-5">
            <h2 className="mb-3 text-lg">{t('trn_step2')}</h2>
            {CLASS_KEYS.map((k) => (
              <div key={k} className="mb-2">
                <div className="mb-1 flex justify-between text-sm"><span>{t('class_' + k)}</span><span className="num">{counts[k]} / {MIN_PER_CLASS}+</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: Math.min(100, (counts[k] / MIN_PER_CLASS) * 100) + '%', background: COLOR[k] }} /></div>
              </div>
            ))}
            <button className="btn-primary mt-3 w-full" disabled={!ready || busy} onClick={train}>{busy ? '…' : t('trn_train', { n: labelled.length })}</button>
            {!ready && <p className="muted mt-2 text-xs">{fvs.length > 1 ? t('trn_fv_mix') : t('trn_need', { n: MIN_PER_CLASS })}</p>}
            {result && (
              <div className="mt-4">
                <div className="flex items-baseline gap-2"><span className="num text-3xl font-semibold text-primary-600 dark:text-primary-300">{fmt(result.cv.acc * 100, 1)}%</span><span className="muted text-sm">{t('trn_acc')}</span></div>
                <table className="num mt-2 w-full text-center text-xs">
                  <thead><tr><th className="muted p-1 text-left font-normal">{t('trn_true')} ↓ / {t('trn_pred')} →</th>{CLASS_KEYS.map((k) => <th key={k} className="p-1" style={{ color: COLOR[k] }}>{t('class_' + k).slice(0, 3)}</th>)}</tr></thead>
                  <tbody>
                    {result.cv.confusion.map((row, i) => (
                      <tr key={CLASS_KEYS[i]}><td className="p-1 text-left" style={{ color: COLOR[CLASS_KEYS[i]] }}>{t('class_' + CLASS_KEYS[i])}</td>
                        {row.map((v, j) => <td key={j} className={`p-1 ${i === j ? 'bg-leaf-500/15 font-semibold' : v ? 'bg-red-500/15' : ''}`}>{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted mt-2 text-xs">{t('trn_cv_note')}</p>
                <button className="btn-primary mt-3 w-full" disabled={busy || demo || !isAdmin} onClick={publish}>{t('trn_publish')}</button>
                {(demo || !isAdmin) && <p className="muted mt-2 text-xs">{demo ? t('trn_pub_demo') : t('trn_pub_admin')}</p>}
              </div>
            )}
            {msg && <p className="mt-3 text-sm text-primary-700 dark:text-primary-300">{msg}</p>}
          </section>

          <section className="card p-5 text-sm">
            <h2 className="mb-2 text-lg">{t('trn_on_machine')}</h2>
            {model ? (
              <>
                <div className="flex justify-between border-b border-black/5 py-1.5 dark:border-white/10"><span className="muted">{t('trn_version')}</span><b className="num">v{model.version}</b></div>
                <div className="flex justify-between border-b border-black/5 py-1.5 dark:border-white/10"><span className="muted">{t('trn_acc')}</span><b className="num">{fmt((model.acc || 0) * 100, 1)}%</b></div>
                <div className="flex justify-between border-b border-black/5 py-1.5 dark:border-white/10"><span className="muted">{t('trn_n')}</span><b className="num">{fmt(model.n_train)}</b></div>
                <div className="flex justify-between py-1.5"><span className="muted">{t('trn_when')}</span><b>{fmtTime(model.t)}</b></div>
              </>
            ) : <p className="muted">{t('trn_no_model')}</p>}
            <p className="muted mt-3 text-xs">{t('trn_how')}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
