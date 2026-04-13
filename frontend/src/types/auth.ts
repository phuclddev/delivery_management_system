export interface AuthRole {
  id: string;
  code: string;
  name: string;
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

export interface LoginPayload {
  credential: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: CurrentUser;
}

export interface MeResponse {
  user: CurrentUser;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshCurrentUser: () => Promise<void>;
}
