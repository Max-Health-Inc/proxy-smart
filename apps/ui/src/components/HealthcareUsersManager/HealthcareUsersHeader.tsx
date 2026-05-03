import { Button } from '@max-health-inc/shared-ui';
import { Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HealthcareUsersHeaderProps {
  onAddUser: () => void;
}

export function HealthcareUsersHeader({ onAddUser }: HealthcareUsersHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
        <div className="flex-1">
          <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
            {t('Healthcare Users')}
          </h1>
          <div className="text-muted-foreground text-lg flex items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <Users className="w-5 h-5 text-primary" />
            </div>
            {t('Manage healthcare professionals and administrative users')}
          </div>
        </div>
        <Button 
          onClick={onAddUser}
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('Add New User')}
        </Button>
      </div>
    </div>
  );
}