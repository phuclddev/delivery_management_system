import { createContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { App as AntdApp } from 'antd';
import {
  fetchCurrentUserRequest,
  impersonateUserRequest,
  loginRequest,
} from './auth-api';
import {
  clearStoredImpersonationState,
  clearStoredToken,
  getStoredImpersonationState,
  getStoredToken,
  setStoredImpersonationState,
  setStoredToken,
} from './token-storage';
import type { AuthContextValue, CurrentUser, LoginPayload } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { message } = AntdApp.useApp();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [impersonationState, setImpersonationState] =
    useState<AuthContextValue['impersonationState']>(() => getStoredImpersonationState());
  const [isInitializing, setIsInitializing] = useState(true);

  const logout = () => {
    clearStoredImpersonationState();
    clearStoredToken();
    setToken(null);
    setUser(null);
    setSession(null);
    setImpersonationState(null);
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
      setSession(response.session ?? null);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const login = async (payload: LoginPayload) => {
    try {
      const response = await loginRequest(payload);
      clearStoredImpersonationState();
      setStoredToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      setSession(response.session ?? null);
      setImpersonationState(null);
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

  const startImpersonation = async (userId: string) => {
    const currentToken = getStoredToken();

    if (!currentToken || !user) {
      throw new Error('You must be signed in to start impersonation.');
    }

    if (session?.isImpersonation) {
      throw new Error('Stop the current impersonation session before starting another one.');
    }

    try {
      const response = await impersonateUserRequest(userId);
      const nextImpersonationState = {
        originalToken: currentToken,
        originalAdmin: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        startedAt: new Date().toISOString(),
      };

      setStoredImpersonationState(nextImpersonationState);
      setStoredToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      setSession(response.session ?? null);
      setImpersonationState(nextImpersonationState);
      message.warning(`You are now impersonating ${response.user.displayName}.`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          (error.response?.data as { message?: string } | undefined)?.message ??
          'Unable to start impersonation.';
        throw new Error(backendMessage);
      }

      throw error;
    }
  };

  const stopImpersonation = async () => {
    const storedState = getStoredImpersonationState();

    if (!storedState?.originalToken) {
      throw new Error('No impersonation session is currently active.');
    }

    setStoredToken(storedState.originalToken);
    clearStoredImpersonationState();
    setToken(storedState.originalToken);
    setSession(null);
    setImpersonationState(null);

    try {
      await refreshCurrentUser();
      message.success('Returned to your original admin session.');
    } catch (error) {
      logout();
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
      session,
      impersonationState,
      isAuthenticated: Boolean(user && token),
      isInitializing,
      isImpersonating: Boolean(session?.isImpersonation),
      login,
      logout,
      refreshCurrentUser,
      startImpersonation,
      stopImpersonation,
    }),
    [
      impersonationState,
      isInitializing,
      login,
      refreshCurrentUser,
      session,
      startImpersonation,
      stopImpersonation,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
