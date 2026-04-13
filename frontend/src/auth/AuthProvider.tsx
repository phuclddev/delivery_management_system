import { createContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { App as AntdApp } from 'antd';
import { fetchCurrentUserRequest, loginRequest } from './auth-api';
import { clearStoredToken, getStoredToken, setStoredToken } from './token-storage';
import type { AuthContextValue, CurrentUser, LoginPayload } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { message } = AntdApp.useApp();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isInitializing, setIsInitializing] = useState(true);

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const refreshCurrentUser = async () => {
    const currentToken = getStoredToken();

    if (!currentToken) {
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const response = await fetchCurrentUserRequest();
      setUser(response.user);
      setToken(currentToken);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const login = async (payload: LoginPayload) => {
    try {
      const response = await loginRequest(payload);
      setStoredToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      message.success('Signed in successfully.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          (error.response?.data as { message?: string } | undefined)?.message ??
          'Authentication failed.';
        throw new Error(backendMessage);
      }

      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (getStoredToken()) {
          await refreshCurrentUser();
        }
      } catch {
        if (mounted) {
          message.error('Your session has expired. Please sign in again.');
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
    };
  }, [message]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isInitializing,
      login,
      logout,
      refreshCurrentUser,
    }),
    [user, token, isInitializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
