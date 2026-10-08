import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Lots from './pages/Lots'
import LotReport from './pages/LotReport'
import Machine from './pages/Machine'

const Viewer3D = lazy(() => import('./pages/Viewer3D'))   // three.js is loaded only when this page is opened

const Page = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
    {children}
  </motion.div>
)

export default function App() {
  const loc = useLocation()
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={loc} key={loc.pathname}>
          <Route path="/" element={<Page><Dashboard /></Page>} />
          <Route path="/lots" element={<Page><Lots /></Page>} />
          <Route path="/lot/:id" element={<Page><LotReport /></Page>} />
          <Route path="/machine" element={<Page><Machine /></Page>} />
          <Route path="/3d" element={<Page><Suspense fallback={<div className="muted py-20 text-center">…</div>}><Viewer3D /></Suspense></Page>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
