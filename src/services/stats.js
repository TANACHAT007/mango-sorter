import { CLASSES, SIZE_GRADES, sizeGrade } from '../config'

// Everything shown on the dashboard / report is computed here from the raw per-fruit records
// ({ t: ms, g: grams, c: class key, conf: 0..1 }), so the page and the printed report can never disagree.
export function lotStats(itemsObj) {
  const items = Object.values(itemsObj || {}).filter((i) => i && typeof i.g === 'number').sort((a, b) => a.t - b.t)
  const n = items.length
  const total = items.reduce((s, i) => s + i.g, 0)
  const mean = n ? total / n : 0
  const sd = n > 1 ? Math.sqrt(items.reduce((s, i) => s + (i.g - mean) ** 2, 0) / (n - 1)) : 0
  const byClass = Object.fromEntries(CLASSES.map((c) => [c.key, { n: 0, g: 0 }]))
  const bySize = Object.fromEntries(SIZE_GRADES.map((s) => [s.key, { n: 0, g: 0 }]))
  for (const i of items) {
    if (byClass[i.c]) { byClass[i.c].n++; byClass[i.c].g += i.g }
    const s = sizeGrade(i.g)
    bySize[s].n++; bySize[s].g += i.g
  }
  // histogram in 50 g bins from 150 g to 700 g
  const bins = Array.from({ length: 11 }, (_, k) => ({ from: 150 + k * 50, n: 0 }))
  for (const i of items) bins[Math.max(0, Math.min(10, Math.floor((i.g - 150) / 50)))].n++
  // rate over the last 5 minutes of the lot's activity
  const last = n ? items[n - 1].t : 0
  const recentN = items.filter((i) => i.t > last - 300000).length
  const span = n > 1 ? Math.min(300000, last - items[0].t) : 0
  const rate = span > 20000 ? recentN / (span / 60000) : 0
  return {
    n, total, mean, sd, byClass, bySize, bins, rate,
    min: n ? Math.min(...items.map((i) => i.g)) : 0,
    max: n ? Math.max(...items.map((i) => i.g)) : 0,
    first: n ? items[0].t : 0, last,
    recent: items.slice(-12).reverse(),
  }
}
