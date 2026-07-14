'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api/auth';
import {
  removeToken,
  getPendingUser,
  readCachedUser,
  writeCachedUser,
  clearCachedUser,
} from './authHelpers';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/auth';
import { handleApiError } from '@/lib/utils/errorHandler';

const AUTH_PRESENT_COOKIE = 'vx_auth_present';
const CSRF_COOKIE = 'vx_csrf';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<AuthResponse>;
  setAuth: (response: AuthResponse) => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const hasSession = Cookies.get(AUTH_PRESENT_COOKIE) === 'true';
        if (hasSession) {
          setTokenState('cookie');
          const pendingUser = getPendingUser();
          const cachedUser = pendingUser ?? readCachedUser();
          if (cachedUser) {
            // Render immediately from the last-known user and revalidate the
            // session in the background instead of blocking first paint on
            // the /me round-trip.
            setUser(cachedUser as User);
            setLoading(false);
          }
          try {
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
            writeCachedUser(userData);
            if (userData.onboardingCompleted) {
              Cookies.set('onboardingCompleted', 'true', { expires: 7 });
            }
          } catch (error: any) {
            const status = error.response?.status;
            if (status === 401 || status === 404 || status === 403) {
              Cookies.remove('authToken');
              Cookies.remove(AUTH_PRESENT_COOKIE);
              Cookies.remove(CSRF_COOKIE);
              removeToken();
              clearCachedUser();
              setTokenState(null);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await authAPI.login(credentials);
      Cookies.remove('authToken');
      removeToken();
      if (response.csrfToken) {
        Cookies.set(CSRF_COOKIE, response.csrfToken, {
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
      Cookies.set(AUTH_PRESENT_COOKIE, 'true', {
        expires: 30,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      // Track onboarding status in cookie for middleware
      if (response.user.onboardingCompleted) {
        Cookies.set('onboardingCompleted', 'true', { expires: 7 });
      } else {
        Cookies.remove('onboardingCompleted');
      }

      setUser(response.user);
      writeCachedUser(response.user);
      setTokenState('cookie');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await authAPI.register(data);

      Cookies.remove('authToken');
      removeToken();

      if (response.session && response.user.isVerified) {
        if (response.csrfToken) {
          Cookies.set(CSRF_COOKIE, response.csrfToken, {
            expires: 30,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        }
        Cookies.set(AUTH_PRESENT_COOKIE, 'true', {
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        setUser(response.user);
        writeCachedUser(response.user);
        setTokenState('cookie');
      } else {
        Cookies.remove(AUTH_PRESENT_COOKIE);
        Cookies.remove(CSRF_COOKIE);
        clearCachedUser();
        setUser(null);
        setTokenState(null);
      }
      
      return response;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }, []);

  const logout = useCallback(() => {
    authAPI.logout().catch(() => undefined);
    Cookies.remove('authToken');
    Cookies.remove(AUTH_PRESENT_COOKIE);
    Cookies.remove(CSRF_COOKIE);
    Cookies.remove('onboardingCompleted');
    removeToken();
    clearCachedUser();
    setUser(null);
    setTokenState(null);
  }, []);

  const setAuth = useCallback((response: AuthResponse) => {
    Cookies.remove('authToken');
    removeToken();
    if (response.csrfToken) {
      Cookies.set(CSRF_COOKIE, response.csrfToken, {
        expires: 30,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    Cookies.set(AUTH_PRESENT_COOKIE, 'true', {
      expires: 30,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    if (response.user.onboardingCompleted) {
      Cookies.set('onboardingCompleted', 'true', { expires: 7 });
    } else {
      Cookies.remove('onboardingCompleted');
    }
    
    setUser(response.user);
    writeCachedUser(response.user);
    setTokenState('cookie');
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    writeCachedUser(updatedUser);
    if (updatedUser.onboardingCompleted) {
      Cookies.set('onboardingCompleted', 'true', { expires: 7 });
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    setAuth,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
