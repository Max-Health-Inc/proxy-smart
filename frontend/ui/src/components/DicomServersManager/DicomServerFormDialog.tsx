import { useState } from 'react'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import { AUTH_TYPES } from './constants'

export const DEFAULT_TIMEOUT_MS = 30000

/** Form state shared by the add and edit dialogs. */
export interface DicomServerFormValues {
  name: string
  baseUrl: string
  authType: string
  username: string
  password: string
  authHeader: string
  timeoutMs: string
}

const EMPTY: DicomServerFormValues = {
  name: '',
  baseUrl: '',
  authType: 'none',
  username: '',
  password: '',
  authHeader: '',
  timeoutMs: String(DEFAULT_TIMEOUT_MS),
}

interface DicomServerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  /** Prefixes the field ids so add and edit never collide in the DOM */
  idPrefix: string
  initial?: Partial<DicomServerFormValues>
  /** Edit exposes the request timeout; add takes the default */
  showTimeout?: boolean
  /** Add clears itself on close so the next open starts blank */
  resetOnClose?: boolean
  placeholders?: { name?: string; baseUrl?: string; authHeader?: boolean }
  onSubmit: (values: DicomServerFormValues) => Promise<void>
  errorFallback: string
}

/**
 * The DICOM server connection form.
 *
 * Add and edit ask for the same connection details and validate them the same
 * way, so the fields, the validation and the submit handling live here and each
 * caller supplies its labels and what to do with the values.
 */
export function DicomServerFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  idPrefix,
  initial,
  showTimeout = false,
  resetOnClose = false,
  placeholders,
  onSubmit,
  errorFallback,
}: DicomServerFormDialogProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<DicomServerFormValues>({ ...EMPTY, ...initial })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof DicomServerFormValues>(key: K, value: DicomServerFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }))

  const handleClose = (val: boolean) => {
    if (!val) {
      setError(null)
      if (resetOnClose) setValues({ ...EMPTY, ...initial })
    }
    onOpenChange(val)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!values.name.trim()) { setError(t('Server name is required')); return }
    if (!values.baseUrl.trim()) { setError(t('Base URL is required')); return }
    try { new URL(values.baseUrl.trim()) } catch { setError(t('Invalid URL format')); return }

    setSubmitting(true)
    try {
      await onSubmit({ ...values, name: values.name.trim(), baseUrl: values.baseUrl.trim() })
      if (resetOnClose) setValues({ ...EMPTY, ...initial })
    } catch (err) {
      setError(err instanceof Error ? err.message : errorFallback)
    } finally {
      setSubmitting(false)
    }
  }

  const { authType } = values
  const needsHeader = authType === 'bearer' || authType === 'header'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`}>{t('Server Name')}</Label>
            <Input
              id={`${idPrefix}-name`}
              placeholder={placeholders?.name}
              value={values.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-url`}>{t('Base URL')}</Label>
            <Input
              id={`${idPrefix}-url`}
              placeholder={placeholders?.baseUrl}
              value={values.baseUrl}
              onChange={e => set('baseUrl', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('Authentication')}</Label>
            <Select value={authType} onValueChange={v => set('authType', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTH_TYPES.map(at => (
                  <SelectItem key={at.value} value={at.value}>{t(at.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {authType === 'basic' && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-user`}>{t('Username')}</Label>
                <Input id={`${idPrefix}-user`} value={values.username} onChange={e => set('username', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-pass`}>{t('Password')}</Label>
                <Input id={`${idPrefix}-pass`} type="password" value={values.password} onChange={e => set('password', e.target.value)} />
              </div>
            </>
          )}

          {needsHeader && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-header`}>
                {authType === 'bearer' ? t('Bearer Token') : t('Authorization Header Value')}
              </Label>
              <Input
                id={`${idPrefix}-header`}
                placeholder={placeholders?.authHeader ? (authType === 'bearer' ? 'eyJhbGci...' : 'Bearer xyz / ApiKey abc') : undefined}
                value={values.authHeader}
                onChange={e => set('authHeader', e.target.value)}
              />
            </div>
          )}

          {showTimeout && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-timeout`}>{t('Timeout (ms)')}</Label>
              <Input id={`${idPrefix}-timeout`} type="number" value={values.timeoutMs} onChange={e => set('timeoutMs', e.target.value)} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>{t('Cancel')}</Button>
          <LoadingButton loading={submitting} onClick={handleSubmit}>{submitLabel}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
