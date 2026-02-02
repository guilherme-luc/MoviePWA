import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppProviders } from './providers/AppProviders'
import { ThemeProvider } from './providers/ThemeProvider'
import { ShowcaseProvider } from './providers/ShowcaseProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <ThemeProvider>
        <ShowcaseProvider>
          <App />
        </ShowcaseProvider>
      </ThemeProvider>
    </AppProviders>
  </React.StrictMode>,
)
