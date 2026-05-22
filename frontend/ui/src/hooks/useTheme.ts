import { useContext } from "react"
import { ThemeProviderContext } from "@/components/theme-provider"
import type { ThemeProviderState } from "@/components/theme-provider"

/**
 * Hook to consume theme context.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext)
  if (!context || !context.__provider) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
