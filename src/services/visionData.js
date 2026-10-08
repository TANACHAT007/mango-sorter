import { useEffect, useMemo, useState } from 'react'
import { fbDb } from './firebase'
import { useData } from '../contexts/DataContext'

// ---- sample pictures for demo mode (drawn as SVG, clearly not camera images) ------------------------------------------
const SKIN = { ripe: ['#f6c21c', '#e09a00'], half_ripe: ['#d5cf3a', '#9fb02a'], green: ['#58b25a', '#2f7d3a'], defect: ['#e9b520', '#c98a00'] }
function rnd(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

export function demoCropSvg(c, seed, w = 160, h = 120) {
  const r = rnd(seed)
  const [a, b] = SKIN[c] || SKIN.ripe
  const rot = Math.round((r() - 0.5) * 24)
  const spots = c === 'defect' ? Array.from({ length: 2 + Math.floor(r() * 3) }, () =>
    `<circle cx="${50 + r() * 60}" cy="${40 + r() * 40}" r="${3 + r() * 5}" fill="#3b2412" opacity=".85"/>`).join('') : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#eceee9"/>
<defs><radialGradient id="g" cx=".38" cy=".35"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
<g transform="rotate(${rot} 80 60)"><ellipse cx="80" cy="60" rx="${52 + r() * 8}" ry="${32 + r() * 5}" fill="url(#g)"/>${spots}</g>
<text x="6" y="${h - 6}" font-family="sans-serif" font-size="9" fill="#8a8f86">sample</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// 20 made-up but class-separable features, so the training screen can be tried without a machine
function demoFeatures(c, seed) {
  const r = rnd(seed * 13 + 5)
  const base = { ripe: [0.82, 0.08, 0.01], half_ripe: [0.5, 0.42, 0.01], green: [0.12, 0.8, 0.01], defect: [0.7, 0.15, 0.09] }[c]
  const f = []
  for (let i = 0; i < 12; i++) f.push(Math.max(0, (i === (c === 'green' ? 4 : c === 'half_ripe' ? 3 : 2) ? 0.55 : 0.04) + (r() - 0.5) * 0.08))
  f.push(0.6 + (r() - 0.5) * 0.1, 0.12 + r() * 0.05, 0.7 + (r() - 0.5) * 0.1, 0.1 + r() * 0.05)
  f.push(base[0] + (r() - 0.5) * 0.14, base[1] + (r() - 0.5) * 0.14, Math.max(0, base[2] + (r() - 0.5) * 0.02), c === 'defect' ? 0.3 + r() * 0.4 : r() * 0.05)
  return f.map((v) => Math.round(v * 1e4) / 1e4)
}

/** Crops + labels of one lot, the live frame and the model on the machine. Demo mode fabricates labelled samples. */
export function useVision(lotId) {
  const { demo, items } = useData()
  const [crops, setCrops] = useState({})
  const [labels, setLabels] = useState({})
  const [frame, setFrame] = useState(null)
  const [model, setModel] = useState(null)
  const [demoLabels, setDemoLabels] = useState({})

  useEffect(() => {
    if (demo || !lotId) return undefined
    let offs = []
    let dead = false
    fbDb().then(({ db, ref, onValue, query, limitToLast }) => {
      if (dead) return
      offs = [
        onValue(query(ref(db, 'crops/' + lotId), limitToLast(300)), (s) => setCrops(s.val() || {})),
        onValue(ref(db, 'labels/' + lotId), (s) => setLabels(s.val() || {})),
      ]
    }).catch(() => {})
    return () => { dead = true; offs.forEach((f) => f()) }
  }, [demo, lotId])

  useEffect(() => {
    if (demo) return undefined
    let offs = []
    let dead = false
    fbDb().then(({ db, ref, onValue }) => {
      if (dead) return
      offs = [onValue(ref(db, 'live/frame'), (s) => setFrame(s.val())), onValue(ref(db, 'model/current'), (s) => setModel(s.val()))]
    }).catch(() => {})
    return () => { dead = true; offs.forEach((f) => f()) }
  }, [demo])

  const demoCrops = useMemo(() => {
    if (!demo || !lotId) return {}
    const out = {}
    for (const [k, it] of Object.entries(items[lotId] || {}).slice(-240)) {
      const seed = hash(lotId + k)
      out[k] = { t: it.t, c: it.c, conf: it.conf, g: it.g, src: 'hsv', fv: 1, f: demoFeatures(it.c, seed), jpg: null, demo: demoCropSvg(it.c, seed) }
    }
    return out
  }, [demo, lotId, items])

  const saveLabel = async (key, c) => {
    if (demo) { setDemoLabels((p) => { const n = { ...p }; if (c) n[key] = { c, t: Date.now() }; else delete n[key]; return n }); return }
    const { db, ref, set, remove } = await fbDb()
    if (c) await set(ref(db, `labels/${lotId}/${key}`), { c, t: Date.now() })
    else await remove(ref(db, `labels/${lotId}/${key}`))
  }
  const publishModel = async (m) => {
    const { db, ref, set } = await fbDb()
    const version = (model?.version || 0) + 1
    const full = { ...m, version, t: Date.now() }
    await set(ref(db, 'model/current'), full)
    await set(ref(db, 'model/history/' + version), { t: full.t, n_train: m.n_train, acc: m.acc })
    return version
  }
  return { crops: demo ? demoCrops : crops, labels: demo ? demoLabels : labels, frame, model, saveLabel, publishModel, demo }
}

export const cropSrc = (c) => (c.jpg ? 'data:image/jpeg;base64,' + c.jpg : c.demo || '')
