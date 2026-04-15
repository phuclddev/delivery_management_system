export interface AuthRole {
  id: string;
  code: string;
  name: string;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthTeam {
  id: string;
  code: string;
  name: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  team: AuthTeam | null;
  roles: AuthRole[];
}

export interface AuthSession {
  isImpersonation: boolean;
  impersonatedBy: AuthUserSummary | null;
}

export interface StoredImpersonationState {
  originalToken: string;
  originalAdmin: AuthUserSummary;
  startedAt: string;
}

export interface LoginPayload {
  credential: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: CurrentUser;
  session?: AuthSession;
}

export interface MeResponse {
  user: CurrentUser;
  session?: AuthSession;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  token: string | null;
  session: AuthSession | null;
  impersonationState: StoredImpersonationState | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isImpersonating: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshCurrentUser: () => Promise<void>;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}
