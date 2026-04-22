"use client"

import * as React from "react"

const DEFAULT_Z_INDEX = 50
const Z_INDEX_INCREMENT = 10

type NextZIndexFn = () => number

const ModalStackContext = React.createContext<NextZIndexFn | null>(null)

interface ModalStackProviderProps {
  children: React.ReactNode
  /** Base z-index for the first modal. Defaults to 50. */
  baseZIndex?: number
}

/**
 * Provides automatic z-index stacking for nested/overlapping dialogs.
 *
 * Wrap your app root with this provider to enable z-index management.
 * Each `<DialogContent>` from shared-ui will automatically acquire a
 * z-index that is higher than any previously opened dialog.
 *
 * Without this provider, dialogs fall back to their default CSS z-index (z-50).
 */
function ModalStackProvider({ children, baseZIndex = DEFAULT_Z_INDEX }: ModalStackProviderProps) {
  const counterRef = React.useRef(baseZIndex)

  // Stable function reference — never causes consumer re-renders
  const nextZIndex = React.useCallback(() => {
    counterRef.current += Z_INDEX_INCREMENT
    return counterRef.current
  }, [])

  return (
    <ModalStackContext.Provider value={nextZIndex}>
      {children}
    </ModalStackContext.Provider>
  )
}

/**
 * Hook for dialog components to acquire a z-index from the modal stack.
 *
 * - Returns a stable z-index higher than any previously opened dialog.
 * - Returns `undefined` when used outside a `ModalStackProvider`,
 *   allowing the component to fall back to its CSS class (z-50).
 * - The z-index is assigned once on mount and never changes.
 */
function useModalLayer(): number | undefined {
  const nextZIndex = React.useContext(ModalStackContext)
  const zIndexRef = React.useRef<number | undefined>(undefined)

  if (nextZIndex !== null && zIndexRef.current === undefined) {
    zIndexRef.current = nextZIndex()
  }

  return zIndexRef.current
}

export {
  ModalStackProvider,
  useModalLayer,
  ModalStackContext,
  DEFAULT_Z_INDEX,
  Z_INDEX_INCREMENT,
  type ModalStackProviderProps,
}
