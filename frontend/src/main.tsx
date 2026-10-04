import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const storedTheme = localStorage.getItem('ciwa-theme')
document.documentElement.dataset.theme = storedTheme === 'light' ? 'light' : 'dark'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
