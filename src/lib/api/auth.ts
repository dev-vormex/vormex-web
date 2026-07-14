import apiClient from './client';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '@/types/auth';

export interface SocketTicketResponse {
  token: string;
  expiresAt: string;
}

export async function getSocketTicket(): Promise<SocketTicketResponse> {
  return apiClient.post('/auth/socket-ticket', {}) as Promise<SocketTicketResponse>;
}

export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', data) as Promise<AuthResponse>;
  },

  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', data) as Promise<AuthResponse>;
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get('/auth/me') as Promise<User>;
  },

  logout: async (): Promise<{ success: boolean }> => {
    return apiClient.post('/auth/logout', {}) as Promise<{ success: boolean }>;
  },

  googleSignIn: async (idToken: string): Promise<AuthResponse> => {
    return apiClient.post('/auth/google', { idToken }) as Promise<AuthResponse>;
  },

  googleCodeSignIn: async (data: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<AuthResponse> => {
    return apiClient.post('/auth/google/code', data) as Promise<AuthResponse>;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/forgot-password', { email }) as Promise<{ message: string }>;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/reset-password', { token, newPassword }) as Promise<{ message: string }>;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`) as Promise<{ message: string }>;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/resend-verification', { email }) as Promise<{ message: string }>;
  },
};
