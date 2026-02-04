import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { StartupGuard } from './components/auth/StartupGuard';

function App() {
  return (
    <StartupGuard>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </StartupGuard>
  )
}

export default App
