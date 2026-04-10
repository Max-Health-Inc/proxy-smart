import { Button } from '@proxy-smart/shared-ui';
import { CheckCircle, XCircle } from 'lucide-react';

interface NotificationToastProps {
  notification: {
    type: 'success' | 'error';
    message: string;
  } | null;
  onClose: () => void;
}

export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
      notification.type === 'success' 
        ? 'bg-card border-border text-foreground' 
        : 'bg-destructive/10 dark:bg-destructive/20 border-destructive/30 text-foreground'
    } animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-center space-x-2">
        {notification.type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-foreground" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
        <span className="font-medium">{notification.message}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="ml-2 h-6 w-6 p-0 text-current hover:bg-current/10"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}