"use client"

import * as React from "react"

const DEFAULT_Z_INDEX = 50
const Z_INDEX_INCREMENT = 10

type NextZIndexFn = () => number

const ModalStackContext = React.createContext<NextZIndexFn | null>(null)

/**
 * Context that propagates the current modal layer's z-index to child components.
 *
 * Dialogs provide this so portaled children (dropdowns, selects, tooltips) can
 * render above the dialog overlay instead of at the default z-50.
 */
const LayerContext = React.createContext<number | undefined>(undefined)

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
  const [zIndex] = React.useState(() => nextZIndex !== null ? nextZIndex() : undefined)
  return zIndex
}

/**
 * Hook for portaled popover-like components (dropdown, select, tooltip) to
 * render above the current modal layer.
 *
 * Returns a z-index 1 higher than the enclosing dialog's layer, or
 * `undefined` when not inside a dialog (so the CSS z-50 class applies).
 */
function useLayerZIndex(): number | undefined {
  const parentZ = React.useContext(LayerContext)
  return parentZ !== undefined ? parentZ + 1 : undefined
}

export {
  ModalStackProvider,
  useModalLayer,
  useLayerZIndex,
  LayerContext,
  ModalStackContext,
  DEFAULT_Z_INDEX,
  Z_INDEX_INCREMENT,
  type ModalStackProviderProps,
}
