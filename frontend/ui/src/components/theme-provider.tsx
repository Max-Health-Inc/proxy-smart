import { createContext, useCallback, useEffect, useMemo, useState } from "react"
import { getTheme, setTheme as setThemeStorage } from "@/lib/storage"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

// Legacy MediaQueryList interface for older browsers
interface LegacyMediaQueryList {
  addListener?: (listener: (mql: MediaQueryList) => void) => void
  removeListener?: (listener: (mql: MediaQueryList) => void) => void
  onchange?: ((mql: MediaQueryList) => void) | null
}

// Internal context type with a sentinel to detect provider usage
type InternalThemeContext = ThemeProviderState & { __provider?: true }

const ThemeProviderContext = createContext<InternalThemeContext | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: Readonly<ThemeProviderProps>) {
  const [theme, setTheme] = useState<Theme>(() => (getTheme(storageKey, defaultTheme) as Theme))
  const [resolvedTheme, setResolvedTheme] = useState<Theme>(theme)

  useEffect(() => {
    const root = window.document.documentElement

    // Always remove both to avoid duplicates
    root.classList.remove("light", "dark")

    if (theme === "system") {
      // Guard for environments where matchMedia is not available
      if (typeof window.matchMedia !== "function") {
        // default to light when matchMedia not available
        root.classList.add("light")
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Fallback for environments without matchMedia
        setResolvedTheme("light")
        return
      }

      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const legacyMql = mql as MediaQueryList & LegacyMediaQueryList

      const apply = (isDark: boolean) => {
        root.classList.remove("light", "dark")
        root.classList.add(isDark ? "dark" : "light")
        setResolvedTheme(isDark ? "dark" : "light")
      }

      // Apply initial value
      apply(mql.matches)

      // Listen for changes in OS preference. Support modern and legacy APIs.
      const listener = (event: MediaQueryListEvent | MediaQueryList) => {
        const matches = "matches" in event ? event.matches : mql.matches
        apply(matches)
      }

      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", listener as EventListener)
      } else if (typeof legacyMql.addListener === "function") {
        legacyMql.addListener(listener)
      }
      // Also set onchange for environments/tests that rely on it
      legacyMql.onchange = listener

      return () => {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", listener as EventListener)
        } else if (typeof legacyMql.removeListener === "function") {
          legacyMql.removeListener(listener)
        }
        if ("onchange" in legacyMql) {
          legacyMql.onchange = null
        }
      }
    }

    // Explicit theme
    root.classList.add(theme)
    setResolvedTheme(theme)
  }, [theme])

  const handleSetTheme = useCallback(
    (newTheme: Theme) => {
      setThemeStorage(storageKey, newTheme)
      setTheme(newTheme)
    },
    [storageKey]
  )

  const value: InternalThemeContext = useMemo(
    () => ({
      theme: resolvedTheme, // Use resolved theme instead of raw theme
      setTheme: handleSetTheme,
      __provider: true,
    }),
    [resolvedTheme, handleSetTheme]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export { ThemeProviderContext }
