export interface ScopeSet {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

export interface ScopeTemplate {
  id: string;
  name: string;
  description: string;
  role: string;
  color: string;
  scopes: string[];
}

export interface BuilderState {
  context: string;
  resource: string;
  permissions: string[];
  searchParams: string;
  customScope: string;
  selectedRole: string | undefined;
}

export interface ScopeValidation {
  valid: boolean;
  message: string;
  type: 'error' | 'warning' | 'success';
  suggestions?: string[];
}
