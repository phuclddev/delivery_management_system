import axios from 'axios';
import {
  clearStoredImpersonationState,
  clearStoredToken,
  getStoredToken,
} from '@/auth/token-storage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      clearStoredImpersonationState();
    }

    return Promise.reject(error);
  },
);
