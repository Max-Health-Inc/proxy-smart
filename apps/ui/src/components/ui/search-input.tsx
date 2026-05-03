import { Search } from 'lucide-react';
import { Input } from '@max-health-inc/shared-ui';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
}

function SearchInput({ placeholder, value, onChange, onSubmit, className }: SearchInputProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('Search...');
  return (
    <div className={cn('relative flex-1 max-w-sm', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onSubmit ? e => { if (e.key === 'Enter') onSubmit(); } : undefined}
        className="pl-9"
      />
    </div>
  );
}

export { SearchInput };
export type { SearchInputProps };