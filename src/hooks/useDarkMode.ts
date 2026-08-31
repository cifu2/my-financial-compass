const STORAGE_KEY = 'darkMode'

/**
 * Dark mode hook.
 * - If the user has an explicit preference, use it.
 * - Otherwise fall back to the system `prefers-color-scheme`.
 * - Persists the explicit preference in localStorage.
 * - Dispatches a 'dark-mode-change' custom event when toggled.
 */
export function useDarkMode(): [enabled: boolean, toggle: () => void] {
  const systemDark = (() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })()

  function toggle() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const current = stored === 'true'
      const next = !current
      localStorage.setItem(STORAGE_KEY, String(next))
      window.dispatchEvent(new Event('dark-mode-change'))
    } catch {
      // localStorage unavailable – ignore
    }
  }

  // Read the current state from localStorage (or fall back to system)
  let enabled: boolean
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    enabled = stored === 'true'
  } catch {
    enabled = systemDark
  }

  return [enabled, toggle]
}