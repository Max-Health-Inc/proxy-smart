import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ErrorBoundary } from "@proxy-smart/shared-ui"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
