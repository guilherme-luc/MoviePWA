import { AppShell } from './components/layout/AppShell'
import { StartupGuard } from './components/auth/StartupGuard'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { MoviesPage } from './pages/MoviesPage'

function App() {
  return (
    <StartupGuard>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/genre/:genre" element={<MoviesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </StartupGuard>
  )
}

export default App
