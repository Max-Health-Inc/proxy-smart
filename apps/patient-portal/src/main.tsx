import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { ErrorBoundary, Spinner } from "@max-health-inc/shared-ui"
import App from "./App"
import "./i18n"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
)
