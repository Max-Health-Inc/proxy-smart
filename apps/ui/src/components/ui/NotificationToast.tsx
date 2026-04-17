import { Button } from '@proxy-smart/shared-ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Toast } from '@/stores/notificationStore';

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div className={`p-4 rounded-lg shadow-lg border ${
      toast.type === 'success'
        ? 'bg-card border-border text-foreground'
        : 'bg-destructive/10 dark:bg-destructive/20 border-destructive/30 text-foreground'
    } animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-center space-x-2">
        {toast.type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-foreground" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
        <span className="font-medium">{toast.message}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="ml-2 h-6 w-6 p-0 text-current hover:bg-current/10"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationToasts() {
  const { toasts, dismiss } = useNotificationStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}