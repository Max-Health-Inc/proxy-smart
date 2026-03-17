import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

const sizeMap = {
  sm: "size-3",
  md: "size-4",
  lg: "size-6",
} as const

function Spinner({ className, size = "md", ...props }: React.ComponentProps<"svg"> & { size?: keyof typeof sizeMap }) {
  return (
    <Loader2Icon role="status" aria-label="Loading" className={cn(sizeMap[size], "animate-spin", className)} {...props} />
  )
}

export { Spinner }
