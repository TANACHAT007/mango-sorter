import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './contexts/I18nContext'
import { DataProvider } from './contexts/DataContext'
import { AdminProvider } from './contexts/AdminContext'

// HashRouter: GitHub Pages has no SPA rewrite, so deep links (…/#/lot/LOT-001 from a QR code) must not 404
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <I18nProvider>
          <DataProvider>
            <AdminProvider>
              <App />
            </AdminProvider>
          </DataProvider>
        </I18nProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
)
