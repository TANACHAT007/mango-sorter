# Mango Sorter — web dashboard

Web page of the school/maker project **"เครื่องคัดแยกมะม่วงบนสายพานลำเลียงด้วยกล้อง"** (camera-based mango sorting conveyor).

- **Dashboard** — live result of the current lot: fruits per outlet (ripe / half-ripe / green / defect), total weight, weight distribution, latest fruits.
- **Lots** — every lot recorded by the machine.
- **Lot weight report** — printable one-page summary with a QR code back to the online report.
- **Machine** — how it works, specifications, 3D design views.

Thai / English, light / dark, installable (PWA). Until the machine uploads data the site shows clearly labelled **sample data**.

## Data
The machine's Raspberry Pi writes to Firebase Realtime Database (`mango-sorter-th`) with a service account; the web page only reads.

```
machine/status        { state, updated, lot }
lots/<lotId>          { id, name, variety, started, ended }
items/<lotId>/<push>  { t, g, c, conf }      # one record per fruit: time, grams, class, confidence
```

Rules (`database.rules.json`): public read, no client writes.

## Develop
```
npm install
npm run dev        # http://localhost:5173/mango-sorter/
npm run build
```
Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
The Pages base path is set in `vite.config.js` (`BASE`) and must match the repository name.
