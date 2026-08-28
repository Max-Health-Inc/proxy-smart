import { useTranslation } from 'react-i18next'
import type { UpdateDicomServerRequest } from '@/lib/api-client'
import type { UpdateDicomServerRequestAuthTypeEnum } from '@/lib/api-client/models/UpdateDicomServerRequest'
import type { DicomServerWithStatus } from './DicomServersManager'
import { DicomServerFormDialog, DEFAULT_TIMEOUT_MS } from './DicomServerFormDialog'

interface EditDicomServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: DicomServerWithStatus | null
  onUpdate: (serverId: string, body: UpdateDicomServerRequest) => Promise<void>
}

export function EditDicomServerDialog({ open, onOpenChange, server, onUpdate }: EditDicomServerDialogProps) {
  const { t } = useTranslation()

  return (
    <DicomServerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Edit DICOM Server')}
      description={t('Update the DICOMweb/PACS server configuration.')}
      submitLabel={t('Save Changes')}
      idPrefix="edit-dicom"
      showTimeout
      initial={{
        name: server?.name ?? '',
        baseUrl: server?.baseUrl ?? '',
        authType: server?.authType ?? 'none',
        username: server?.username ?? '',
        password: server?.password ?? '',
        authHeader: server?.authHeader ?? '',
        timeoutMs: String(server?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      }}
      errorFallback="Failed to update server"
      onSubmit={({ name, baseUrl, authType, username, password, authHeader, timeoutMs }) => {
        if (!server) return Promise.resolve()
        return onUpdate(server.id, {
          name,
          baseUrl,
          authType: authType !== 'none' ? authType as UpdateDicomServerRequestAuthTypeEnum : undefined,
          username: authType === 'basic' ? username : undefined,
          password: authType === 'basic' ? password : undefined,
          authHeader: (authType === 'bearer' || authType === 'header') ? authHeader : undefined,
          timeoutMs: parseInt(timeoutMs, 10) || DEFAULT_TIMEOUT_MS,
        })
      }}
    />
  )
}
