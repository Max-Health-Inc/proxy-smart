import { Alert, AlertDescription } from '@proxy-smart/shared-ui';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { SettingsMessage } from '@/hooks/useAdminSettings';

/** The success/error banner every admin settings page shows above its cards. */
export function SettingsStatusMessage({ message }: { message: SettingsMessage | null }) {
  if (!message) return null;
  const success = message.type === 'success';

  return (
    <Alert
      className={success
        ? 'border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-400/10'
        : 'border-destructive/20 bg-destructive/10'}
    >
      {success
        ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        : <AlertCircle className="w-4 h-4 text-destructive" />}
      <AlertDescription className={success ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
        {message.text}
      </AlertDescription>
    </Alert>
  );
}
