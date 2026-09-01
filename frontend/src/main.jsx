import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Apply saved theme before first paint
const savedTheme = localStorage.getItem('tomatoTheme') || 'light'
document.documentElement.classList.toggle('dark', savedTheme === 'dark')

// Register service worker — autoUpdate handles refresh silently
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
