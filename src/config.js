// Firebase web config (public by design — access is controlled by the database rules: everyone may read,
// only the machine's service account may write). Leave apiKey empty to run on built-in sample data.
export const firebaseConfig = {
  apiKey: 'AIzaSyBAI7qsZaXX9-Gb2gPl5PfU3Q-ywZQhqRI',
  authDomain: 'mango-sorter-th.firebaseapp.com',
  databaseURL: 'https://mango-sorter-th-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mango-sorter-th',
  appId: '1:330606039011:web:c0603d8af15e5b22075ad6',
}

export const MACHINE = {
  name: { th: 'เครื่องคัดแยกมะม่วงบนสายพานลำเลียงด้วยกล้อง', en: 'Camera-based mango sorting conveyor' },
  size: '1200 × 1070 × 1194 mm',
  belt: 'PU 200 mm · ≈ 0.10 m/s',
  capacity: '≈ 10–20 ผล/นาที',
}

// sort classes = the 4 outlets of the machine (same keys as the Pi vision program)
export const CLASSES = [
  { key: 'ripe', color: '#f2a900', outlet: 'END' },
  { key: 'half_ripe', color: '#c9c21a', outlet: 'P3' },
  { key: 'green', color: '#22a559', outlet: 'P2' },
  { key: 'defect', color: '#b4532a', outlet: 'P1' },
]

// size grade by weight — shown for information only, it does not change the outlet
export const SIZE_GRADES = [
  { key: 'L', min: 400 },
  { key: 'M', min: 300 },
  { key: 'S', min: 0 },
]
export const sizeGrade = (g) => SIZE_GRADES.find((s) => g >= s.min).key
