import { Button } from '@max-health-inc/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Landmark } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { OrgStatisticsCards } from './OrgStatisticsCards';
import { OrgAddForm } from './OrgAddForm';
import { OrgTable } from './OrgTable';
import { OrgEditDialog } from './OrgEditDialog';
import { OrgMembersDialog } from './OrgMembersDialog';
import type { OrgFormData } from './OrgAddForm';

import type { Organization } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

export function OrganizationsManager() {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [membersOrg, setMembersOrg] = useState<Organization | null>(null);
  const { notify } = useNotificationStore();

  const refreshOrgs = useCallback(async () => {
    if (!isAuthenticated || !clientApis.organizations) {
      setOrgs([]);
      return;
    }
    try {
      const result = await clientApis.organizations.getAdminOrganizations({ limit: 100 });
      setOrgs(result);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrgs([]);
      notify({ type: 'error', message: t('Failed to load organizations.') });
    }
  }, [isAuthenticated, clientApis.organizations, t, notify]);

  useEffect(() => {
    if (!isAuthenticated || !clientApis.organizations) return;
    clientApis.organizations.getAdminOrganizations({ limit: 100 })
      .then(result => setOrgs(result))
      .catch(error => {
        console.error('Failed to load organizations:', error);
        setOrgs([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, clientApis.organizations]);

  const handleCreate = async (form: OrgFormData) => {
    if (!clientApis.organizations) return;
    try {
      await clientApis.organizations.postAdminOrganizations({
        createOrganizationRequest: {
          name: form.name,
          alias: form.alias || undefined,
          description: form.description || undefined,
          enabled: form.enabled,
          redirectUrl: form.redirectUrl || undefined,
          domains: form.domains.length > 0 ? form.domains.map((d) => ({ name: d })) : undefined,
        },
      });
      await refreshOrgs();
      setShowAddForm(false);
      notify({ type: 'success', message: t('Organization created successfully!') });
    } catch (error) {
      console.error('Failed to create organization:', error);
      notify({ type: 'error', message: t('Failed to create organization.') });
    }
  };

  const handleUpdate = async (orgId: string, data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    redirectUrl?: string;
    domains?: Array<{ name: string; verified?: boolean }>;
  }) => {
    if (!clientApis.organizations) return;
    try {
      await clientApis.organizations.putAdminOrganizationsByOrgId({
        orgId,
        updateOrganizationRequest: data,
      });
      await refreshOrgs();
      setEditingOrg(null);
      notify({ type: 'success', message: t('Organization updated successfully!') });
    } catch (error) {
      console.error('Failed to update organization:', error);
      notify({ type: 'error', message: t('Failed to update organization.') });
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!clientApis.organizations) return;
    try {
      await clientApis.organizations.deleteAdminOrganizationsByOrgId({ orgId });
      await refreshOrgs();
      notify({ type: 'success', message: t('Organization deleted successfully!') });
    } catch (error) {
      console.error('Failed to delete organization:', error);
      notify({ type: 'error', message: t('Failed to delete organization.') });
    }
  };

  const handleToggleStatus = async (orgId: string) => {
    if (!clientApis.organizations) return;
    const org = orgs.find((o) => o.id === orgId);
    if (!org) return;
    try {
      await clientApis.organizations.putAdminOrganizationsByOrgId({
        orgId,
        updateOrganizationRequest: { enabled: !(org.enabled !== false) },
      });
      await refreshOrgs();
    } catch (error) {
      console.error('Failed to toggle organization status:', error);
      notify({ type: 'error', message: t('Failed to update organization status.') });
    }
  };

  if (loading) {
    return <PageLoadingState message={t('Loading Organizations...')} className="min-h-[300px]" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">

      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('Organization Management')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Landmark className="w-5 h-5 text-primary" />
              </div>
              {t('Configure and manage Keycloak organizations for multi-tenancy')}
            </div>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-5 w-5 mr-2" />
            {t('Add Organization')}
          </Button>
        </div>
      </div>

      <OrgStatisticsCards orgs={orgs} />

      <OrgAddForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={handleCreate}
      />

      <OrgTable
        orgs={orgs}
        onEdit={setEditingOrg}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onManageMembers={setMembersOrg}
      />

      <OrgEditDialog
        key={editingOrg?.id ?? 'new'}
        isOpen={!!editingOrg}
        onClose={() => setEditingOrg(null)}
        onUpdate={handleUpdate}
        org={editingOrg}
      />

      <OrgMembersDialog
        isOpen={!!membersOrg}
        onClose={() => setMembersOrg(null)}
        org={membersOrg}
      />
    </div>
  );
}
