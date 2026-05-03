import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ErrorBoundary, TooltipProvider, Toaster } from "@max-health-inc/shared-ui"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <TooltipProvider>
        <App />
        <Toaster position="bottom-right" richColors theme="system" />
      </TooltipProvider>
    </ErrorBoundary>
  </StrictMode>
)
