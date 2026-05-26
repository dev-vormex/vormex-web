import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/utils/constants';
import { removeToken } from '@/lib/auth/authHelpers';

const CSRF_COOKIE = 'vx_csrf';
const AUTH_PRESENT_COOKIE = 'vx_auth_present';
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function clearBrowserAuthState(): void {
  Cookies.remove('authToken');
  Cookies.remove(AUTH_PRESENT_COOKIE);
  Cookies.remove(CSRF_COOKIE);
  Cookies.remove('onboardingCompleted');
  removeToken();
}

function redirectToLoginIfNeeded(isAuthRequest: boolean): Promise<never> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentPath = window.location.pathname;
  const isAuthPage = currentPath === '/login';

  if (!isAuthPage && !isAuthRequest) {
    window.location.replace('/login');
    return new Promise<never>(() => {});
  }

  return null;
}

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: attach CSRF token for httpOnly-cookie auth.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const method = (config.method || 'get').toLowerCase();
      const csrfToken = Cookies.get(CSRF_COOKIE);
      if (csrfToken && UNSAFE_METHODS.has(method) && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // Remove Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle responses and errors
apiClient.interceptors.response.use(
  (response) => {
    // Return response data directly
    return response.data;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const errorCode = (error.response?.data as { code?: string } | undefined)?.code;
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isAuthRequest = url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/google') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/verify-email') ||
      url.includes('/auth/resend-verification');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              ...(Cookies.get(CSRF_COOKIE)
                ? { 'X-CSRF-Token': Cookies.get(CSRF_COOKIE) as string }
                : {}),
            },
          }
        );
        const csrfToken = refreshResponse.data?.csrfToken;
        if (csrfToken) {
          Cookies.set(CSRF_COOKIE, csrfToken, {
            expires: 30,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        }
        return apiClient(originalRequest);
      } catch {
        // Fall through to the normal unauthenticated cleanup.
      }
    }
    
    // Handle 401 Unauthorized or 404 on auth/me (user not found after db reset)
    if (status === 401 || (status === 404 && url.includes('/auth/me'))) {
      if (typeof window !== 'undefined') {
        clearBrowserAuthState();
        const redirectPromise = redirectToLoginIfNeeded(isAuthRequest);
        if (redirectPromise) {
          return redirectPromise;
        }
      }
    }

    if (status === 403 && errorCode === 'invalid_csrf') {
      if (typeof window !== 'undefined') {
        clearBrowserAuthState();
        const redirectPromise = redirectToLoginIfNeeded(isAuthRequest);
        if (redirectPromise) {
          return redirectPromise;
        }
      }
    }
    
    // Handle 403 Forbidden (email not verified)
    if (status === 403) {
      // Let the component handle this error
    }
    
    // Return rejected promise with error
    return Promise.reject(error);
  }
);

export default apiClient;
