// Sample data so the site works before the real machine is connected (clearly labelled in the UI).
// Deterministic pseudo-random numbers → the same demo lots on every device.
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function makeLot(id, name, started, n, seed, open = false) {
  const r = rng(seed)
  const gauss = () => (r() + r() + r() + r() - 2) / 0.58
  const items = {}
  let t = started
  for (let i = 0; i < n; i++) {
    t += 2200 + Math.floor(r() * 2600)
    const u = r()
    const c = u < 0.46 ? 'ripe' : u < 0.72 ? 'half_ripe' : u < 0.92 ? 'green' : 'defect'
    const g = Math.round(Math.max(190, Math.min(640, 355 + gauss() * 62 + (c === 'green' ? -18 : 0))))
    items['d' + String(i).padStart(4, '0')] = { t, g, c, conf: Math.round((0.82 + r() * 0.17) * 100) / 100 }
  }
  return {
    meta: { id, name, variety: 'น้ำดอกไม้สีทอง', started, ended: open ? null : t },
    items,
  }
}

export function buildDemo(now = Date.now()) {
  const day = 86400000
  const lots = [
    makeLot('LOT-DEMO-003', 'สวนตัวอย่าง แปลง A (เช้า)', now - 14 * 60000, 148, 31, true),
    makeLot('LOT-DEMO-002', 'สวนตัวอย่าง แปลง B', now - day - 3 * 3600000, 412, 22),
    makeLot('LOT-DEMO-001', 'ชุดทดสอบเครื่อง', now - 3 * day, 96, 13),
  ]
  const out = { lots: {}, items: {}, machine: { status: { state: 'running', updated: now, lot: lots[0].meta.id } } }
  for (const l of lots) {
    out.lots[l.meta.id] = l.meta
    out.items[l.meta.id] = l.items
  }
  return out
}

// next simulated fruit for the open demo lot (called every few seconds to make the dashboard feel alive)
export function demoNextItem(seedN) {
  const r = rng(977 + seedN * 7919)
  const u = r()
  const c = u < 0.46 ? 'ripe' : u < 0.72 ? 'half_ripe' : u < 0.92 ? 'green' : 'defect'
  const g = Math.round(300 + r() * 130 + (r() - 0.5) * 60)
  return { t: Date.now(), g, c, conf: Math.round((0.84 + r() * 0.15) * 100) / 100 }
}
