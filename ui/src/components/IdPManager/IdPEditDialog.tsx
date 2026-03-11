import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Shield } from 'lucide-react';
import type { IdentityProviderFormData } from '@/lib/types/api';

interface IdPEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (idp: IdentityProviderFormData) => Promise<void>;
  editingIdp: IdentityProviderFormData | null;
  setEditingIdp: (
    idp: IdentityProviderFormData | null
      | ((previous: IdentityProviderFormData | null) => IdentityProviderFormData | null)
  ) => void;
}

export function IdPEditDialog({ 
  isOpen, 
  onClose, 
  onUpdate, 
  editingIdp, 
  setEditingIdp 
}: IdPEditDialogProps) {
  if (!editingIdp) return null;

  const updateConfig = <K extends keyof IdentityProviderFormData['config']>(
    key: K,
    value: IdentityProviderFormData['config'][K]
  ) => {
    setEditingIdp((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        config: {
          ...prev.config,
          [key]: value,
        },
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                Edit Identity Provider
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                Modify the configuration for {editingIdp.displayName ?? editingIdp.alias}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          onUpdate(editingIdp);
        }} className="space-y-6">
          {/* Basic Configuration */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Basic Configuration</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="edit-displayName" className="text-sm font-semibold text-foreground">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={editingIdp.displayName ?? ''}
                  onChange={(e) => setEditingIdp({ ...editingIdp, displayName: e.target.value })}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-alias" className="text-sm font-semibold text-foreground">Alias</Label>
                <Input
                  id="edit-alias"
                  value={editingIdp.alias}
                  readOnly
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm bg-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-3">
                <Label htmlFor="edit-vendor" className="text-sm font-semibold text-foreground">Provider Vendor</Label>
                <Input
                  id="edit-vendor"
                  value={editingIdp.vendorName ?? ''}
                  onChange={(e) => setEditingIdp({ ...editingIdp, vendorName: e.target.value })}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-type" className="text-sm font-semibold text-foreground">Authentication Type</Label>
                <Select
                  value={(editingIdp.providerId ?? 'saml').toUpperCase()}
                  onValueChange={(value) => setEditingIdp({ ...editingIdp, providerId: value.toLowerCase() })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAML">SAML 2.0</SelectItem>
                    <SelectItem value="OAuth2">OAuth 2.0</SelectItem>
                    <SelectItem value="OIDC">OpenID Connect</SelectItem>
                    <SelectItem value="LDAP">LDAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-entityId" className="text-sm font-semibold text-foreground">Entity ID / Client ID</Label>
                <Input
                  id="edit-entityId"
                  value={editingIdp.config.entityId ?? ''}
                  onChange={(e) => updateConfig('entityId', e.target.value)}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <Label htmlFor="edit-ssoUrl" className="text-sm font-semibold text-foreground">SSO URL / Authorization Endpoint</Label>
              <Input
                id="edit-ssoUrl"
                value={editingIdp.config.singleSignOnServiceUrl ?? ''}
                onChange={(e) => updateConfig('singleSignOnServiceUrl', e.target.value)}
                className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {/* Security Toggle */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="edit-enabled"
                checked={editingIdp.enabled ?? true}
                onCheckedChange={(checked) => setEditingIdp({ ...editingIdp, enabled: checked === true })}
              />
              <Label htmlFor="edit-enabled" className="text-sm text-foreground">Enabled</Label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
            >
              Update Provider
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
