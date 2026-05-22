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
import type { UpdateDicomServerRequest } from '@/lib/api-client'
import type { UpdateDicomServerRequestAuthTypeEnum } from '@/lib/api-client/models/UpdateDicomServerRequest'
import type { DicomServerWithStatus } from './DicomServersManager'
import { AUTH_TYPES } from './constants'

interface EditDicomServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: DicomServerWithStatus | null
  onUpdate: (serverId: string, body: UpdateDicomServerRequest) => Promise<void>
}

export function EditDicomServerDialog({ open, onOpenChange, server, onUpdate }: EditDicomServerDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(server?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(server?.baseUrl ?? '')
  const [authType, setAuthType] = useState<string>(server?.authType ?? 'none')
  const [username, setUsername] = useState(server?.username ?? '')
  const [password, setPassword] = useState(server?.password ?? '')
  const [authHeader, setAuthHeader] = useState(server?.authHeader ?? '')
  const [timeoutMs, setTimeoutMs] = useState<string>(String(server?.timeoutMs ?? 30000))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = (val: boolean) => {
    if (!val) setError(null)
    onOpenChange(val)
  }

  const handleSubmit = async () => {
    if (!server) return
    setError(null)
    if (!name.trim()) { setError(t('Server name is required')); return }
    if (!baseUrl.trim()) { setError(t('Base URL is required')); return }
    try { new URL(baseUrl.trim()) } catch { setError(t('Invalid URL format')); return }

    setSubmitting(true)
    try {
      await onUpdate(server.id, {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        authType: authType !== 'none' ? authType as UpdateDicomServerRequestAuthTypeEnum : undefined,
        username: authType === 'basic' ? username : undefined,
        password: authType === 'basic' ? password : undefined,
        authHeader: (authType === 'bearer' || authType === 'header') ? authHeader : undefined,
        timeoutMs: parseInt(timeoutMs, 10) || 30000,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Edit DICOM Server')}</DialogTitle>
          <DialogDescription>{t('Update the DICOMweb/PACS server configuration.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-dicom-name">{t('Server Name')}</Label>
            <Input id="edit-dicom-name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dicom-url">{t('Base URL')}</Label>
            <Input id="edit-dicom-url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('Authentication')}</Label>
            <Select value={authType} onValueChange={setAuthType}>
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
                <Label htmlFor="edit-dicom-user">{t('Username')}</Label>
                <Input id="edit-dicom-user" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dicom-pass">{t('Password')}</Label>
                <Input id="edit-dicom-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </>
          )}

          {(authType === 'bearer' || authType === 'header') && (
            <div className="space-y-2">
              <Label htmlFor="edit-dicom-header">{authType === 'bearer' ? t('Bearer Token') : t('Authorization Header Value')}</Label>
              <Input id="edit-dicom-header" value={authHeader} onChange={e => setAuthHeader(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-dicom-timeout">{t('Timeout (ms)')}</Label>
            <Input id="edit-dicom-timeout" type="number" value={timeoutMs} onChange={e => setTimeoutMs(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>{t('Cancel')}</Button>
          <LoadingButton loading={submitting} onClick={handleSubmit}>{t('Save Changes')}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
