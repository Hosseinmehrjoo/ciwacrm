import { useState } from 'react'

export type ThemeName = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => (
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  ))

  function toggleTheme() {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('ciwa-theme', next)
    setTheme(next)
  }

  return { theme, toggleTheme }
}
