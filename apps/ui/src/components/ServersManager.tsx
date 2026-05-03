import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@proxy-smart/shared-ui'
import { useState } from 'react'
import { FhirServersManager } from '@/components/FhirServersManager'
import { DicomServersManager } from '@/components/DicomServersManager'
import { useTranslation } from 'react-i18next'

export function ServersManager() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('fhir')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <ResponsiveTabsList>
        <TabsTrigger value="fhir">{t('FHIR Servers')}</TabsTrigger>
        <TabsTrigger value="dicom">{t('DICOM Servers')}</TabsTrigger>
      </ResponsiveTabsList>
      <TabsContent value="fhir">
        <FhirServersManager />
      </TabsContent>
      <TabsContent value="dicom">
        <DicomServersManager />
      </TabsContent>
    </Tabs>
  )
}
