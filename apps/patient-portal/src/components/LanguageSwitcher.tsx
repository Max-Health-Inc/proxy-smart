import { useTranslation } from "react-i18next"
import { Globe } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@max-health-inc/shared-ui"

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <Select value={i18n.language?.split("-")[0] ?? "en"} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="h-8 w-auto gap-1.5 border-none bg-transparent text-sm font-normal shadow-none">
        <Globe className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
