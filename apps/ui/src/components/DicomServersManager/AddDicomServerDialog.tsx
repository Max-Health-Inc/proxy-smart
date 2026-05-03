import { useState } from 'react'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui'
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
import type { AddDicomServerRequest, AddDicomServerRequestAuthTypeEnum } from '@/lib/api-client'
import { AUTH_TYPES } from './constants'

interface AddDicomServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (body: AddDicomServerRequest) => Promise<void>
}

export function AddDicomServerDialog({ open, onOpenChange, onAdd }: AddDicomServerDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [authType, setAuthType] = useState<AddDicomServerRequestAuthTypeEnum>('none' as AddDicomServerRequestAuthTypeEnum)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authHeader, setAuthHeader] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setBaseUrl('')
    setAuthType('none')
    setUsername('')
    setPassword('')
    setAuthHeader('')
    setError(null)
  }

  const handleClose = (val: boolean) => {
    if (!val) reset()
    onOpenChange(val)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!name.trim()) { setError(t('Server name is required')); return }
    if (!baseUrl.trim()) { setError(t('Base URL is required')); return }
    try { new URL(baseUrl.trim()) } catch { setError(t('Invalid URL format')); return }

    setSubmitting(true)
    try {
      await onAdd({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        authType: authType !== 'none' ? authType : undefined,
        username: authType === 'basic' ? username : undefined,
        password: authType === 'basic' ? password : undefined,
        authHeader: (authType === 'bearer' || authType === 'header') ? authHeader : undefined,
      })
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Add DICOM Server')}</DialogTitle>
          <DialogDescription>{t('Configure a new DICOMweb/PACS server connection.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dicom-name">{t('Server Name')}</Label>
            <Input id="dicom-name" placeholder="e.g. Orthanc Local" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dicom-url">{t('Base URL')}</Label>
            <Input id="dicom-url" placeholder="https://orthanc.example.com/dicom-web" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('Authentication')}</Label>
            <Select value={authType} onValueChange={v => setAuthType(v as AddDicomServerRequestAuthTypeEnum)}>
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
                <Label htmlFor="dicom-user">{t('Username')}</Label>
                <Input id="dicom-user" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dicom-pass">{t('Password')}</Label>
                <Input id="dicom-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </>
          )}

          {(authType === 'bearer' || authType === 'header') && (
            <div className="space-y-2">
              <Label htmlFor="dicom-header">{authType === 'bearer' ? t('Bearer Token') : t('Authorization Header Value')}</Label>
              <Input id="dicom-header" placeholder={authType === 'bearer' ? 'eyJhbGci...' : 'Bearer xyz / ApiKey abc'} value={authHeader} onChange={e => setAuthHeader(e.target.value)} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>{t('Cancel')}</Button>
          <LoadingButton loading={submitting} onClick={handleSubmit}>{t('Add Server')}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
