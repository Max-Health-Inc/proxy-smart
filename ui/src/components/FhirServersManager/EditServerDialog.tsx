import { useState } from 'react';
import { Edit, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@proxy-smart/shared-ui';
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
  loading: boolean;
  error?: string | null;
  urlError?: string | null;
}

export function EditServerDialog({
  open,
  onOpenChange,
  server,
  onUpdateServer,
  loading,
  error,
  urlError
}: EditServerDialogProps) {
  const { t } = useTranslation();
  const [editServerUrl, setEditServerUrl] = useState(server?.url || '');
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);

  // Sync editServerUrl when server changes
  const serverUrl = server?.url;
  if (serverUrl !== undefined && editServerUrl !== serverUrl && editServerUrl === '') {
    setEditServerUrl(serverUrl);
  }

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
      setLocalUrlError('Server URL is required');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setLocalUrlError('Please enter a valid URL (e.g., https://hapi.fhir.org/baseR4)');
      return;
    }

    // If the URL is the same as current, no need to update
    if (trimmedUrl === server.url) {
      handleClose();
      return;
    }

    setLocalUrlError(null);
    await onUpdateServer(server, trimmedUrl);
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
            Update the URL for "{server?.serverName || server?.name}". The server name and details will be automatically retrieved from the server's metadata.
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
            <div className="col-span-4 text-red-600 text-sm mt-2">
              {displayError}
            </div>
          )}
          {error && (
            <div className="col-span-4 text-red-600 text-sm mt-2">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !editServerUrl.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('Updating...')}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                {t('Update Server')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}