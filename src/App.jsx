import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Lots from './pages/Lots'
import LotReport from './pages/LotReport'
import Machine from './pages/Machine'

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
