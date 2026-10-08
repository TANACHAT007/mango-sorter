import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { useData } from '../contexts/DataContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import { CLASSES, sizeGrade } from '../config'
import { ClassBadge } from '../components/Charts'

// ---- machine geometry in metres, CAD axes (x = belt travel, y = depth, z = up) — from 02_design/model.py -----------------
const BELT_Z = 0.7495
const YC = 0.52
const FRUIT_R = 0.04
const PADDLE = { P1: { x: 0.44, side: +1 }, P2: { x: 0.62, side: -1 }, P3: { x: 0.83, side: +1 } }
const OUTLET = { defect: 'P1', green: 'P2', half_ripe: 'P3', ripe: 'END' }
const CHUTE = {            // where the fruit leaves the belt and where it ends (crate)
  P1: { x: 0.535, yEnd: 0.84, zEnd: 0.56 }, P2: { x: 0.737, yEnd: 0.2, zEnd: 0.56 }, P3: { x: 0.925, yEnd: 0.84, zEnd: 0.56 },
  END: { x: 1.155, yEnd: 0.2, zEnd: 0.4 },
}
const FRUIT_COLOR = { ripe: 0xf2b200, half_ripe: 0xc9c21a, green: 0x3fa34d, defect: 0x9a5a2a }
const BELT_V = 0.1          // m/s (real set speed); the view runs at `speed` × real time
const ARM_RAD = (60 * Math.PI) / 180
const DUMP_RAD = (-70 * Math.PI) / 180
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const lerp = (a, b, t) => a + (b - a) * t

// One fruit's whole journey as a function of its own clock (s). Returns position, cradle tilt, paddle demand, done.
function journey(f, t, hasWeigh) {
  const out = OUTLET[f.c] || 'END'
  const ch = CHUTE[out]
  const xStart = 0.095
  let T0 = 0
  if (hasWeigh) {
    const tWeigh = 1.1, tTilt = 0.7
    if (t < tWeigh) return { p: [xStart, 0.4, 0.84], tilt: 0, weighing: true }
    if (t < tWeigh + tTilt) {
      const k = ease((t - tWeigh) / tTilt)
      return { p: [xStart, lerp(0.4, 0.5, k), lerp(0.84, BELT_Z + FRUIT_R, k * k)], tilt: k }
    }
    T0 = tWeigh + tTilt
  }
  const tb = t - T0
  const tiltBack = hasWeigh ? Math.max(0, 1 - tb / 0.5) : 0
  const x = xStart + BELT_V * tb
  const leaveX = out === 'END' ? 1.09 : PADDLE[out].x + 0.03
  if (x < leaveX) {
    const y = lerp(hasWeigh ? 0.5 : YC, YC, ease(tb / 1.5))
    const need = out !== 'END' && x > PADDLE[out].x - 0.14 ? out : null
    return { p: [x, y, BELT_Z + FRUIT_R], tilt: tiltBack, paddle: need, onBelt: true }
  }
  const tl = (x - leaveX) / BELT_V            // seconds since it left the straight run
  if (out === 'END') {
    const k = Math.min(1, tl / 1.6)
    return { p: [lerp(leaveX, ch.x, ease(Math.min(1, k * 2))), lerp(YC, ch.yEnd, ease(k)), lerp(BELT_Z + FRUIT_R, ch.zEnd, k * k)], tilt: 0, done: k >= 1 }
  }
  // slide along the 60° paddle to the belt edge, then down the chute into the crate
  const side = PADDLE[out].side
  const yEdge = side > 0 ? 0.63 : 0.41
  const k1 = Math.min(1, tl / 1.0)
  if (k1 < 1) return { p: [lerp(leaveX, ch.x, k1), lerp(YC, yEdge, ease(k1)), BELT_Z + FRUIT_R], tilt: 0, paddle: out }
  const k2 = Math.min(1, (tl - 1.0) / 1.1)
  return { p: [ch.x, lerp(yEdge, ch.yEnd, k2), lerp(BELT_Z, ch.zEnd, k2 * k2)], tilt: 0, paddle: k2 < 0.25 ? out : null, done: k2 >= 1 }
}

export default function Viewer3D() {
  const { current, items, watchLot, demo } = useData()
  const { t, fmt } = useI18n()
  const { dark } = useTheme()
  const mount = useRef(null)
  const api = useRef(null)
  const [state, setState] = useState('loading')       // loading | ready | error
  const [speed, setSpeed] = useState(2)
  const [last, setLast] = useState(null)
  const speedRef = useRef(speed)
  speedRef.current = speed
  useEffect(() => { if (current) watchLot(current.id) }, [current, watchLot])

  // ---- three.js scene (created once) -----------------------------------------------------------------------------------
  useEffect(() => {
    const el = mount.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 30)
    camera.position.set(-0.75, 1.55, 1.25)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0.6, 0.6, -0.5)
    controls.maxPolarAngle = Math.PI * 0.52
    controls.minDistance = 0.5
    controls.maxDistance = 6
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556055, 1.5))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(-1.5, 3, -2)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xffffff, 0.7)
    fill.position.set(2.5, 2, 2.5)
    scene.add(fill)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.MeshStandardMaterial({ color: 0x8a9086, roughness: 1, transparent: true, opacity: 0.35 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0.6, -0.013, -0.5)
    scene.add(floor)

    // CAD frame: Z up → three.js Y up. Children keep CAD coordinates.
    const cad = new THREE.Group()
    cad.rotation.x = -Math.PI / 2
    scene.add(cad)
    const nodes = {}
    const fruits = []                        // { c, g, t, mesh }
    const fruitGeo = new THREE.SphereGeometry(1, 24, 16)
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    let disposed = false
    loader.load(import.meta.env.BASE_URL + 'model/machine.min.glb', (gltf) => {
      if (disposed) return
      gltf.scene.traverse((o) => {
        if (['P1', 'P2', 'P3', 'W'].includes(o.name)) nodes[o.name] = o
        if (o.isMesh) {
          o.material.side = THREE.DoubleSide
          if (o.material.transparent) { o.material.opacity = Math.min(o.material.opacity, 0.35); o.material.depthWrite = false }
        }
      })
      cad.add(gltf.scene)
      setState('ready')
    }, undefined, () => setState('error'))

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const paddleAng = { P1: 0, P2: 0, P3: 0 }
    let tilt = 0
    let prev = performance.now()
    let raf = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - prev) / 1000) * speedRef.current
      prev = now
      const want = { P1: 0, P2: 0, P3: 0 }
      let wantTilt = 0
      const hasW = Boolean(nodes.W)
      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i]
        f.t += dt
        f.mesh.visible = f.t >= 0                 // queued behind the fruit that is on the cradle now
        if (f.t < 0) continue
        const j = journey(f, f.t, hasW)
        f.mesh.position.set(j.p[0], j.p[1], j.p[2])
        f.mesh.rotation.x += dt * (j.onBelt ? 0 : 2.5)
        if (j.paddle) want[j.paddle] = 1
        wantTilt = Math.max(wantTilt, j.tilt || 0)
        if (j.done) { cad.remove(f.mesh); f.mesh.material.dispose(); fruits.splice(i, 1) }
      }
      for (const k of ['P1', 'P2', 'P3']) {
        paddleAng[k] += (want[k] - paddleAng[k]) * Math.min(1, dt * 9)
        if (nodes[k]) nodes[k].rotation.z = PADDLE[k].side * ARM_RAD * paddleAng[k]
      }
      tilt += (wantTilt - tilt) * Math.min(1, dt * 10)
      if (nodes.W) nodes.W.rotation.x = DUMP_RAD * tilt
      controls.update()
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    api.current = {
      spawn(item) {
        // never put two fruits on the cradle at once: delay the new one behind the youngest
        const youngest = fruits.reduce((m, f) => Math.min(m, f.t), 99)
        const mesh = new THREE.Mesh(fruitGeo, new THREE.MeshStandardMaterial({ color: FRUIT_COLOR[item.c] || 0xf2b200, roughness: 0.55 }))
        const s = 0.9 + Math.min(0.35, Math.max(-0.15, ((item.g || 350) - 350) / 600))
        mesh.scale.set(0.062 * s, FRUIT_R * s, FRUIT_R * s)
        mesh.position.set(0.095, 0.4, 2)
        cad.add(mesh)
        fruits.push({ c: item.c, g: item.g, t: Math.min(0, youngest - 2.6), mesh })
      },
      view(name) {
        const v = { iso: [-0.75, 1.55, 1.25], top: [0.6, 3.1, -0.499], front: [0.6, 0.95, 2.3], feed: [-1.25, 1.15, -0.25] }[name]
        camera.position.set(...v)
        controls.target.set(name === 'feed' ? 0.25 : 0.6, name === 'feed' ? 0.75 : 0.6, -0.5)
      },
    }
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  // ---- feed the animation from the data: every new fruit record of the current lot becomes a fruit in the view ---------
  const list = useMemo(() => Object.entries(current ? items[current.id] || {} : {}).sort((a, b) => a[1].t - b[1].t), [current, items])
  const seen = useRef(null)
  useEffect(() => {
    if (state !== 'ready' || !list.length) return
    if (seen.current === null) {                     // first load: show the latest fruit only, do not replay the whole lot
      seen.current = new Set(list.slice(0, -1).map(([k]) => k))
    }
    for (const [k, it] of list) {
      if (!seen.current.has(k)) {
        seen.current.add(k)
        api.current?.spawn(it)
        setLast(it)
      }
    }
  }, [list, state])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl">{t('view3d_title')}</h1>
          <p className="muted text-sm">{demo ? t('view3d_sub_demo') : t('view3d_sub_live')}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {['iso', 'feed', 'front', 'top'].map((v) => <button key={v} className="btn-ghost text-sm" onClick={() => api.current?.view(v)}>{t('view_' + v)}</button>)}
          <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/15" />
          {[1, 2, 4].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${speed === s ? 'bg-primary-500 text-white' : 'btn-ghost'}`}>×{s}</button>
          ))}
        </div>
      </div>

      <div className="card relative overflow-hidden" style={{ background: dark ? 'radial-gradient(circle at 50% 35%, #2a332e, #101412)' : 'radial-gradient(circle at 50% 35%, #ffffff, #dfe4dc)' }}>
        <div ref={mount} className="h-[62vh] min-h-[380px] w-full touch-none" />
        {state === 'loading' && <div className="muted absolute inset-0 grid place-items-center">{t('view3d_loading')}</div>}
        {state === 'error' && <div className="absolute inset-0 grid place-items-center text-red-500">{t('view3d_error')}</div>}
        {last && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-white/85 px-3 py-2 text-sm shadow-soft backdrop-blur dark:bg-ink-800/85">
            <div className="muted text-xs">{t('view3d_last')}</div>
            <div className="mt-0.5 flex items-center gap-2"><ClassBadge c={last.c} /><b className="num">{fmt(last.g)} {t('g')}</b><span className="chip bg-black/5 dark:bg-white/10">{sizeGrade(last.g)}</span></div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {CLASSES.map((c) => (
            <span key={c.key} className="chip bg-white/85 text-ink-700 backdrop-blur dark:bg-ink-800/85 dark:text-stone-200">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{t('class_' + c.key)} → {c.outlet}
            </span>
          ))}
        </div>
      </div>
      <p className="muted text-xs">{t('view3d_note')}</p>
    </div>
  )
}
