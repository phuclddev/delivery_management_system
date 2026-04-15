import type { StoredImpersonationState } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'delivery_management_access_token';
const IMPERSONATION_STATE_KEY = 'delivery_management_impersonation_state';

export function getStoredToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getStoredImpersonationState(): StoredImpersonationState | null {
  const rawValue = window.localStorage.getItem(IMPERSONATION_STATE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredImpersonationState;
  } catch {
    clearStoredImpersonationState();
    return null;
  }
}

export function setStoredImpersonationState(state: StoredImpersonationState): void {
  window.localStorage.setItem(IMPERSONATION_STATE_KEY, JSON.stringify(state));
}

export function clearStoredImpersonationState(): void {
  window.localStorage.removeItem(IMPERSONATION_STATE_KEY);
}
