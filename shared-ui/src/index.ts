// Components
export { Button, buttonVariants } from "./components/button"
export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "./components/card"
export { Badge, badgeVariants } from "./components/badge"
export { Input } from "./components/input"
export { Label } from "./components/label"
export { Spinner } from "./components/spinner"
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from "./components/select"
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from "./components/tabs"
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/tooltip"
export { ErrorBoundary } from "./components/error-boundary"
export { AppHeader, type AppHeaderProps } from "./components/app-header"

// Utilities
export { cn } from "./lib/utils"
export { createSmartAppConfig, type SmartAppConfig } from "./lib/smart-app-config"
export { CHART_COLORS } from "./lib/chart-colors"
export { ADMIN_TABS, type AdminTab } from "./lib/admin-tabs"

// FHIR helpers
export { formatHumanName } from "./lib/fhir-helpers"

// Auth utilities
export { onAuthError, reportAuthError } from "./lib/auth-error"

// Hooks
export { useBranding, type BrandInfo } from "./hooks/use-branding"
