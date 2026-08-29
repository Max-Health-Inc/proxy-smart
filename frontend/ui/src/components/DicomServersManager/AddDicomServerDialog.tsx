// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useTranslation } from 'react-i18next'
import type { AddDicomServerRequest, AddDicomServerRequestAuthTypeEnum } from '@max-health-inc/proxy-smart-client'
import { DicomServerFormDialog } from './DicomServerFormDialog'

interface AddDicomServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (body: AddDicomServerRequest) => Promise<void>
}

export function AddDicomServerDialog({ open, onOpenChange, onAdd }: AddDicomServerDialogProps) {
  const { t } = useTranslation()

  return (
    <DicomServerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Add DICOM Server')}
      description={t('Configure a new DICOMweb/PACS server connection.')}
      submitLabel={t('Add Server')}
      idPrefix="dicom"
      resetOnClose
      placeholders={{ name: 'e.g. Orthanc Local', baseUrl: 'https://orthanc.example.com/dicom-web', authHeader: true }}
      errorFallback="Failed to add server"
      onSubmit={({ name, baseUrl, authType, username, password, authHeader }) => onAdd({
        name,
        baseUrl,
        authType: authType !== 'none' ? authType as AddDicomServerRequestAuthTypeEnum : undefined,
        username: authType === 'basic' ? username : undefined,
        password: authType === 'basic' ? password : undefined,
        authHeader: (authType === 'bearer' || authType === 'header') ? authHeader : undefined,
      })}
    />
  )
}
