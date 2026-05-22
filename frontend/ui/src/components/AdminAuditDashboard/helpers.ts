import { Plus, FileEdit, Trash2, Zap, Search } from 'lucide-react';

export const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: FileEdit,
  delete: Trash2,
  action: Zap,
  read: Search,
};

export function actionColor(action: string): string {
  switch (action) {
    case 'create': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    case 'action': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

export function statusColor(success: boolean): string {
  return success
    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
}
