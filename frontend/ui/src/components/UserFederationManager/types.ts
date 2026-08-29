// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import type { UserFederationProviderResponse } from '@max-health-inc/proxy-smart-client';

/** Shared shapes for the LDAP user federation screens */

export interface FederationWithStatus extends UserFederationProviderResponse {
  status: 'active' | 'inactive' | 'unknown';
}

export interface FormData {
  name: string;
  connectionUrl: string;
  bindDn: string;
  bindCredential: string;
  usersDn: string;
  usernameLDAPAttribute: string;
  rdnLDAPAttribute: string;
  uuidLDAPAttribute: string;
  userObjectClasses: string;
  editMode: string;
  vendor: string;
  searchScope: string;
  authType: string;
  pagination: boolean;
  importEnabled: boolean;
  syncRegistrations: boolean;
  trustEmail: boolean;
  batchSizeForSync: string;
  fullSyncPeriod: string;
  changedSyncPeriod: string;
  connectionPooling: boolean;
  startTls: boolean;
}

export const defaultFormData: FormData = {
  name: '',
  connectionUrl: '',
  bindDn: '',
  bindCredential: '',
  usersDn: '',
  usernameLDAPAttribute: 'uid',
  rdnLDAPAttribute: 'uid',
  uuidLDAPAttribute: 'entryUUID',
  userObjectClasses: 'inetOrgPerson, organizationalPerson',
  editMode: 'READ_ONLY',
  vendor: 'other',
  searchScope: '2',
  authType: 'simple',
  pagination: true,
  importEnabled: true,
  syncRegistrations: false,
  trustEmail: false,
  batchSizeForSync: '1000',
  fullSyncPeriod: '-1',
  changedSyncPeriod: '-1',
  connectionPooling: true,
  startTls: false,
};
