import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { TooltipProvider } from "@proxy-smart/shared-ui"
import { Toaster } from "@/components/ui/sonner"
import App from "./App"

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(
    <StrictMode>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </StrictMode>
  )
}
