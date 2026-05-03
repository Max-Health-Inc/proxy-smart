import { useState, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Spinner, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@proxy-smart/shared-ui"
import { QRCodeSVG } from "qrcode.react"
import { createShl as createShlRequest, type ShlResponse } from "@/lib/shl-client"
import { QrCode, Copy, Check, Clock, Info } from "lucide-react"
import { useTranslation } from "react-i18next"

const EXPIRY_OPTIONS = [
  { value: "60", labelKey: "shareQr.expiry1h" },
  { value: "240", labelKey: "shareQr.expiry4h" },
  { value: "1440", labelKey: "shareQr.expiry24h" },
  { value: "4320", labelKey: "shareQr.expiry72h" },
] as const

export interface ShareQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  verifiedOnly: boolean
}

export function ShareQRDialog({ open, onOpenChange, verifiedOnly }: ShareQRDialogProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shlData, setShlData] = useState<ShlResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [expiryMinutes, setExpiryMinutes] = useState("60")
  const [expiresIn, setExpiresIn] = useState(0)
  const [shortenUrl, setShortenUrl] = useState(false)
  const [maxUses, setMaxUses] = useState("")

  const createShl = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await createShlRequest({
        verifiedOnly: !verifiedOnly,
        expiresInMinutes: parseInt(expiryMinutes),
        label: t("shareQr.label"),
        shortenUrl,
        ...(shortenUrl && maxUses && { maxUses: parseInt(maxUses) }),
      })
      setShlData(data)
      setExpiresIn(Math.max(0, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 60000)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create share link")
    } finally {
      setLoading(false)
    }
  }, [verifiedOnly, expiryMinutes, shortenUrl, maxUses, t])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShlData(null)
      setError(null)
      setCopied(false)
      setExpiryMinutes("60")
      setExpiresIn(0)
      setShortenUrl(false)
      setMaxUses("")
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const copyLink = useCallback(async () => {
    if (!shlData) return
    try {
      await navigator.clipboard.writeText(shlData.shortUrl ?? shlData.viewerUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the URL text
    }
  }, [shlData])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            {t("shareQr.title")}
          </DialogTitle>
          <DialogDescription>
            {t("shareQr.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {!shlData && !loading && !error && (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t("shareQr.expiryLabel")}</label>
                <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* URL Shortening opt-in */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shorten-url"
                    checked={shortenUrl}
                    onChange={(e) => setShortenUrl(e.target.checked)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  <label htmlFor="shorten-url" className="text-sm font-medium cursor-pointer">
                    {t("shareQr.shortenUrlLabel", "Shorten URL")}
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                        {t("shareQr.shortenUrlTooltip", "The link will be shortened via go.maxhealth.tech and stored securely until it expires.")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {shortenUrl && (
                  <div className="flex flex-col gap-1 pl-6">
                    <label htmlFor="max-uses" className="text-xs text-muted-foreground">
                      {t("shareQr.maxUsesLabel", "Max uses (optional)")}
                    </label>
                    <Input
                      id="max-uses"
                      type="number"
                      min={1}
                      placeholder={t("shareQr.maxUsesPlaceholder", "Unlimited")}
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t("shareQr.maxUsesHint", "Link expires after this many views")}
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={createShl} className="w-full">
                {t("shareQr.createLink")}
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">{t("shareQr.generating")}</p>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={createShl}>
                {t("shareQr.retry")}
              </Button>
            </div>
          )}

          {shlData && !loading && (
            <>
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG
                  value={shlData.shortUrl ?? shlData.viewerUrl}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-3.5" />
                <span>{t("shareQr.expiresIn", { minutes: expiresIn })}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={copyLink}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t("shareQr.copied") : t("shareQr.copyLink")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
