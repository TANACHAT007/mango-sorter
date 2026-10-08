// Softmax (multinomial logistic) regression on the feature vectors the machine uploads with every fruit crop.
// The machine applies exactly this model:  z = (f - mu) / sigma ;  logits = W·z + b ;  class = argmax ; conf = max softmax.
// Reference implementation on the machine side: 08_firmware/pi_vision/tools/train_softmax.py (same maths, same defaults).

export const CLASS_KEYS = ['green', 'half_ripe', 'ripe', 'defect']

function standardise(X) {
  const d = X[0].length
  const mu = new Array(d).fill(0)
  const sigma = new Array(d).fill(0)
  for (const x of X) for (let j = 0; j < d; j++) mu[j] += x[j]
  for (let j = 0; j < d; j++) mu[j] /= X.length
  for (const x of X) for (let j = 0; j < d; j++) sigma[j] += (x[j] - mu[j]) ** 2
  for (let j = 0; j < d; j++) sigma[j] = Math.sqrt(sigma[j] / X.length) || 1      // constant feature → divide by 1
  for (let j = 0; j < d; j++) if (sigma[j] < 1e-6) sigma[j] = 1
  return { mu, sigma }
}

const scale = (x, mu, sigma) => x.map((v, j) => (v - mu[j]) / sigma[j])

function softmax(z) {
  const m = Math.max(...z)
  const e = z.map((v) => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / s)
}

export function predict(model, f) {
  const z = scale(f, model.mu, model.sigma)
  const p = softmax(model.W.map((w, k) => w.reduce((s, wj, j) => s + wj * z[j], model.b[k])))
  let k = 0
  for (let i = 1; i < p.length; i++) if (p[i] > p[k]) k = i
  return { c: model.classes[k], conf: p[k], p }
}

/** X: number[][], y: class index[] → { mu, sigma, W, b }.  Full-batch gradient descent, deterministic (zero init). */
export function fit(X, y, nClass, { epochs = 500, lr = 0.3, l2 = 1e-3 } = {}) {
  const n = X.length, d = X[0].length
  const { mu, sigma } = standardise(X)
  const Z = X.map((x) => scale(x, mu, sigma))
  const W = Array.from({ length: nClass }, () => new Array(d).fill(0))
  const b = new Array(nClass).fill(0)
  // class weights so a rare class (defect) is not ignored
  const cnt = new Array(nClass).fill(0)
  for (const k of y) cnt[k]++
  const cw = cnt.map((c) => (c ? n / (nClass * c) : 0))
  for (let ep = 0; ep < epochs; ep++) {
    const gW = Array.from({ length: nClass }, () => new Array(d).fill(0))
    const gb = new Array(nClass).fill(0)
    for (let i = 0; i < n; i++) {
      const z = Z[i]
      const p = softmax(W.map((w, k) => w.reduce((s, wj, j) => s + wj * z[j], b[k])))
      for (let k = 0; k < nClass; k++) {
        const g = (p[k] - (y[i] === k ? 1 : 0)) * cw[y[i]]
        gb[k] += g
        for (let j = 0; j < d; j++) gW[k][j] += g * z[j]
      }
    }
    for (let k = 0; k < nClass; k++) {
      b[k] -= (lr * gb[k]) / n
      for (let j = 0; j < d; j++) W[k][j] -= lr * (gW[k][j] / n + l2 * W[k][j])
    }
  }
  return { mu, sigma, W, b }
}

/** Stratified k-fold cross-validation → { acc, confusion[true][pred], n }. Deterministic split (index order). */
export function crossValidate(X, y, nClass, folds = 5) {
  const byClass = Array.from({ length: nClass }, () => [])
  y.forEach((k, i) => byClass[k].push(i))
  const fold = new Array(X.length)
  for (const idx of byClass) idx.forEach((i, n) => { fold[i] = n % folds })
  const confusion = Array.from({ length: nClass }, () => new Array(nClass).fill(0))
  let ok = 0
  for (let f = 0; f < folds; f++) {
    const tr = [], te = []
    for (let i = 0; i < X.length; i++) (fold[i] === f ? te : tr).push(i)
    if (!te.length || !tr.length) continue
    const m = fit(tr.map((i) => X[i]), tr.map((i) => y[i]), nClass)
    const model = { ...m, classes: CLASS_KEYS.slice(0, nClass) }
    for (const i of te) {
      const k = CLASS_KEYS.indexOf(predict(model, X[i]).c)
      confusion[y[i]][k]++
      if (k === y[i]) ok++
    }
  }
  return { acc: X.length ? ok / X.length : 0, confusion, n: X.length }
}

const r4 = (v) => Math.round(v * 1e4) / 1e4

/** samples: [{ f: number[], c: class key }] → model object in the `model/current` format (without version / t). */
export function trainModel(samples, fv) {
  const X = samples.map((s) => s.f)
  const y = samples.map((s) => CLASS_KEYS.indexOf(s.c))
  const cv = crossValidate(X, y, CLASS_KEYS.length)
  const m = fit(X, y, CLASS_KEYS.length)
  return {
    model: { fv, classes: CLASS_KEYS, mu: m.mu.map(r4), sigma: m.sigma.map(r4), W: m.W.map((w) => w.map(r4)), b: m.b.map(r4), n_train: X.length, acc: r4(cv.acc) },
    cv,
  }
}
