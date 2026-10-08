// node tests/softmax.test.mjs — checks the in-browser trainer on separable synthetic data
import { CLASS_KEYS, trainModel, predict } from '../src/services/softmax.js'
let s = 42
const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const centre = { green: [0.1, 0.8, 0.01, 0.5], half_ripe: [0.5, 0.45, 0.01, 0.5], ripe: [0.85, 0.08, 0.01, 0.5], defect: [0.7, 0.15, 0.1, 0.5] }
const samples = []
for (const c of CLASS_KEYS) for (let i = 0; i < 40; i++) samples.push({ c, f: centre[c].map((v, j) => (j === 3 ? v : v + (r() - 0.5) * (j === 2 ? 0.02 : 0.15))) })
const { model, cv } = trainModel(samples, 1)
console.log('cv acc', cv.acc, 'n', cv.n, 'confusion', JSON.stringify(cv.confusion))
const p = predict(model, centre.defect)
console.log('predict defect centre →', p.c, p.conf.toFixed(3), '| constant feature sigma', model.sigma[3])
if (cv.acc < 0.9 || p.c !== 'defect' || model.W.length !== 4 || model.W[0].length !== 4 || model.sigma[3] !== 0.01) { console.error('FAIL'); process.exit(1) }
console.log('OK')
