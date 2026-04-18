import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { TooltipProvider, ErrorBoundary } from "@proxy-smart/shared-ui"
import App from "./App"

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
