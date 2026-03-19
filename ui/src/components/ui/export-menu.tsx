import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from '@proxy-smart/shared-ui';
import { useTranslation } from 'react-i18next';

interface ExportMenuItem {
  label: string;
  description?: string;
  onClick: () => void;
}

interface ExportMenuProps {
  items: ExportMenuItem[];
  label?: string;
}

function ExportMenu({ items, label }: ExportMenuProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('Export');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen(!open)}>
        <Download className="w-4 h-4 mr-2" />
        {resolvedLabel}
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-background border border-border rounded-2xl shadow-xl z-50">
          <div className="p-2">
            {items.map((item, i) => (
              <Button
                key={i}
                variant="ghost"
                onClick={() => { item.onClick(); setOpen(false); }}
                className="w-full text-left justify-start h-auto px-4 py-3 rounded-xl"
              >
                <div>
                  <div className="font-semibold text-foreground">{item.label}</div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { ExportMenu };
export type { ExportMenuProps, ExportMenuItem };