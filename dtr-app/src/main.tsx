import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ErrorBoundary } from "@proxy-smart/shared-ui"
import { Toaster } from "@/components/ui/sonner"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster position="bottom-right" richColors />
    </ErrorBoundary>
  </StrictMode>
)
