import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { Button, Input, Label } from '@proxy-smart/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FhirServerWithState } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface EditServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: FhirServerWithState | null;
  onUpdateServer: (server: FhirServerWithState, newUrl: string) => Promise<void>;
  urlError?: string | null;
}

export function EditServerDialog({
  open,
  onOpenChange,
  server,
  onUpdateServer,
  urlError
}: EditServerDialogProps) {
  const { t } = useTranslation();
  const [editServerUrl, setEditServerUrl] = useState(server?.url || '');
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync editServerUrl when server changes
  useEffect(() => {
    if (server?.url) {
      setEditServerUrl(server.url);
    }
  }, [server?.url]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!server) return;
    
    const trimmedUrl = editServerUrl.trim();
    
    if (!trimmedUrl) {
      setLocalUrlError(t('Server URL is required'));
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setLocalUrlError(t('Please enter a valid URL (e.g., https://hapi.fhir.org/baseR4)'));
      return;
    }

    // If the URL is the same as current, no need to update
    if (trimmedUrl === server.url) {
      handleClose();
      return;
    }

    setLocalUrlError(null);
    setSubmitting(true);
    try {
      await onUpdateServer(server, trimmedUrl);
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEditServerUrl('');
    setLocalUrlError(null);
    onOpenChange(false);
  };

  const displayError = urlError || localUrlError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('Fix Server URL')}</DialogTitle>
          <DialogDescription>
            {t('Update the URL for "{{name}}". The server name and details will be automatically retrieved from the server\'s metadata.', { name: server?.serverName || server?.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-server-url" className="text-right">
              {t('Server URL')}
            </Label>
            <Input
              id="edit-server-url"
              value={editServerUrl}
              onChange={(e) => {
                setEditServerUrl(e.target.value);
                setLocalUrlError(null);
              }}
              placeholder="https://hapi.fhir.org/baseR4"
              className="col-span-3"
            />
          </div>
          {displayError && (
            <div className="col-span-4 text-sm text-destructive mt-2">
              {displayError}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            {t('Cancel')}
          </Button>
          <LoadingButton
            type="button"
            onClick={handleSubmit}
            loading={submitting}
            loadingText={t('Updating...')}
            disabled={!editServerUrl.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t('Update Server')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}