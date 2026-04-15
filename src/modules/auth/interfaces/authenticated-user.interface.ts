export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  isImpersonation?: boolean;
  impersonatedBy?: string;
  impersonatedByEmail?: string;
}
