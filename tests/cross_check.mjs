// node tests/cross_check.mjs <features.csv> <out model.json> <out preds.json>
// trains with the web trainer on the machine's own feature CSV; a Python script then loads the model with the Pi code
import fs from 'node:fs'
import { trainModel, predict, CLASS_KEYS } from '../src/services/softmax.js'
const [, , csv, outModel, outPred] = process.argv
const lines = fs.readFileSync(csv, 'utf8').trim().split(/\r?\n/)
const head = lines[0].split(',')
const fi = head.map((h, i) => (/^(hue_|s_|v_|yellow|green|dark|aspect)/.test(h) ? i : -1)).filter((i) => i >= 0)
const li = head.indexOf('label')
const samples = lines.slice(1).map((l) => l.split(',')).filter((r) => CLASS_KEYS.includes(r[li])).map((r) => ({ c: r[li], f: fi.map((i) => Number(r[i])) }))
const { model, cv } = trainModel(samples, 1)
const full = { ...model, version: 1, t: Date.now() }
fs.writeFileSync(outModel, JSON.stringify(full))
fs.writeFileSync(outPred, JSON.stringify(samples.map((s) => { const p = predict(full, s.f); return { f: s.f, c: p.c, conf: p.conf } })))
console.log('samples', samples.length, 'features', fi.length, 'cv acc', cv.acc)
