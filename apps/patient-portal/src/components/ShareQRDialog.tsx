import { useState, useCallback, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Spinner,
} from "@proxy-smart/shared-ui"
import { QRCodeSVG } from "qrcode.react"
import { createShl as createShlRequest, type ShlResponse } from "@/lib/shl-client"
import { QrCode, Copy, Check, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"

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

  const createShl = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await createShlRequest({
        verifiedOnly: !verifiedOnly,
        expiresInMinutes: 60,
        label: t("shareQr.label"),
      })
      setShlData(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create share link")
    } finally {
      setLoading(false)
    }
  }, [verifiedOnly, t])

  // Trigger SHL creation when dialog opens
  useEffect(() => {
    if (open && !shlData && !loading) {
      createShl()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShlData(null)
      setError(null)
      setCopied(false)
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const copyLink = useCallback(async () => {
    if (!shlData) return
    try {
      await navigator.clipboard.writeText(shlData.viewerUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the URL text
    }
  }, [shlData])

  const expiresIn = shlData
    ? Math.max(0, Math.round((new Date(shlData.expiresAt).getTime() - Date.now()) / 60000))
    : 0

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
                  value={shlData.viewerUrl}
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
