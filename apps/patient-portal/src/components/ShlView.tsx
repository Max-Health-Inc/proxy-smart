/**
 * SHL Viewer — read-only patient data view from a SMART Health Link.
 *
 * Decrypts the SHL from the URL hash, creates a bearer-token FhirClient,
 * injects it into the shared fhir-client module, then renders Dashboard
 * in read-only mode. No SMART auth flow needed.
 */

import { useEffect, useState } from "react"
import { Spinner, Badge } from "@max-health-inc/shared-ui"
import { parseShl, isShlExpired, resolveShl, createShlFhirClient, type ShlResult } from "@/lib/shl-viewer-client"
import { setActiveFhirClient, resetFhirClient } from "@/lib/fhir-client"
import { setShlDicomwebMode, resetShlDicomwebMode } from "@/lib/dicomweb"
import { Dashboard } from "@/components/Dashboard"
import { AlertCircle, Link2, Clock, Lock, ShieldOff, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"

type ShlState =
  | { phase: "loading" }
  | { phase: "passcode"; label?: string }
  | { phase: "ready"; result: ShlResult; patientId: string }
  | { phase: "error"; message: string }

export function ShlView() {
  const { t } = useTranslation()
  const [state, setState] = useState<ShlState>({ phase: "loading" })
  const [passcode, setPasscode] = useState("")

  // Resolve the SHL on mount
  useEffect(() => {
    resolve()
    return () => {
      resetFhirClient()
      resetShlDicomwebMode()
    }
  }, [])

  async function resolve(passcodeInput?: string) {
    try {
      setState({ phase: "loading" })
      const hash = window.location.hash.slice(1) // strip #
      if (!hash) throw new Error("No share link found in URL")

      const { shl } = parseShl(hash)

      if (isShlExpired(shl)) throw new Error("This share link has expired")

      let result: ShlResult
      try {
        result = await resolveShl(shl, passcodeInput)
      } catch (err) {
        if (err instanceof Error && err.message.includes("Passcode")) {
          setState({ phase: "passcode", label: shl.label })
          return
        }
        throw err
      }

      // Create a bearer-token FHIR client and inject it
      const { client, fetchFn } = createShlFhirClient(result.access)
      setActiveFhirClient(client, fetchFn, result.access.aud)

      // Route DICOMweb requests through the SHL proxy with the session token
      setShlDicomwebMode(result.access.access_token, result.access.aud)

      setState({
        phase: "ready",
        result,
        patientId: result.access.patient,
      })
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Failed to open share link",
      })
    }
  }

  if (state.phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">{t("shl.decrypting", "Opening shared health records...")}</p>
      </div>
    )
  }

  if (state.phase === "passcode") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 max-w-sm mx-auto">
        <Lock className="size-12 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">{t("shl.passcodeRequired", "Passcode Required")}</h2>
          {state.label && <p className="text-muted-foreground">{state.label}</p>}
          <p className="text-sm text-muted-foreground">
            {t("shl.passcodeHint", "This share link is protected. Enter the passcode to view the records.")}
          </p>
        </div>
        <form
          className="w-full space-y-3"
          onSubmit={(e) => { e.preventDefault(); resolve(passcode) }}
        >
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder={t("shl.enterPasscode", "Enter passcode")}
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            autoFocus
          />
          <button
            type="submit"
            className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t("shl.unlock", "Unlock")}
          </button>
        </form>
      </div>
    )
  }

  if (state.phase === "error") {
    const isExpired = state.message.toLowerCase().includes("expired")
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 max-w-md mx-auto text-center px-4">
        {isExpired ? (
          <>
            <div className="rounded-full bg-amber-100 dark:bg-amber-950/50 p-4">
              <ShieldOff className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {t("shl.expiredTitle", "This Link Has Expired")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(
                  "shl.expiredDescription",
                  "The person who shared these health records set a time limit for access. This link is no longer active."
                )}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 w-full space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t("shl.expiredWhatNow", "What can you do?")}</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>{t("shl.expiredTip1", "Ask the sender for a new link")}</li>
                <li>{t("shl.expiredTip2", "Check your messages for an updated link")}</li>
                <li>{t("shl.expiredTip3", "The sender can create a new share from their patient portal")}</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {t("shl.errorTitle", "Unable to Open Link")}
              </h2>
              <p className="text-muted-foreground text-sm">{state.message}</p>
            </div>
            <button
              onClick={() => resolve()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <RefreshCw className="size-4" />
              {t("shl.retry", "Try Again")}
            </button>
          </>
        )}
      </div>
    )
  }

  // Ready — show info banner + read-only Dashboard
  const { result, patientId } = state
  return (
    <div className="space-y-4">
      {/* SHL info banner */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm">
        <Link2 className="size-4 text-muted-foreground shrink-0" />
        <span className="font-medium">
          {result.label || t("shl.sharedRecords", "Shared Health Records")}
        </span>
        <Badge variant="secondary" className="gap-1">
          <Clock className="size-3" />
          {t("shl.expiresAt", "Expires {{date}}", { date: format(result.expiresAt, "MMM d, yyyy h:mm a") })}
        </Badge>
      </div>

      <Dashboard readOnly patientId={patientId} />
    </div>
  )
}
