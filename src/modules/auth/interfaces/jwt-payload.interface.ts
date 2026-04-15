export interface JwtPayload {
  sub: string;
  email: string;
  is_impersonation?: boolean;
  impersonated_by?: string;
  impersonated_by_email?: string;
}
