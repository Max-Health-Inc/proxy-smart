import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@proxy-smart/shared-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddServer: (url: string) => Promise<void>;
  loading: boolean;
  error?: string | null;
  urlError?: string | null;
}

export function AddServerDialog({
  open,
  onOpenChange,
  onAddServer,
  loading,
  error,
  urlError
}: AddServerDialogProps) {
  const { t } = useTranslation();
  const [newServerUrl, setNewServerUrl] = useState('');
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    const trimmedUrl = newServerUrl.trim();
    
    if (!trimmedUrl) {
      setLocalUrlError('Server URL is required');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setLocalUrlError('Please enter a valid URL (e.g., https://hapi.fhir.org/baseR4)');
      return;
    }

    setLocalUrlError(null);
    await onAddServer(trimmedUrl);
  };

  const handleClose = () => {
    setNewServerUrl('');
    setLocalUrlError(null);
    onOpenChange(false);
  };

  const displayError = urlError || localUrlError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('Add New FHIR Server')}</DialogTitle>
          <DialogDescription>
            {t('Enter the base URL of the FHIR server. The server name and details will be automatically retrieved from the server\'s metadata.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="server-url" className="text-right">
              {t('Server URL')}
            </Label>
            <Input
              id="server-url"
              value={newServerUrl}
              onChange={(e) => {
                setNewServerUrl(e.target.value);
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
            disabled={loading || !newServerUrl.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('Adding Server...')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('Add Server')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}