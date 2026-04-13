const ACCESS_TOKEN_KEY = 'delivery_management_access_token';

export function getStoredToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

