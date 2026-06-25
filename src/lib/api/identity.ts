import apiClient from './client';

export type IdentityTrustLevel =
  | 'BASIC'
  | 'EMAIL_VERIFIED'
  | 'PHONE_VERIFIED'
  | 'STUDENT_VERIFIED'
  | 'ID_VERIFIED';

export interface IdentityVerificationRecord {
  id: string;
  type: 'PHONE' | 'STUDENT_EMAIL' | 'ID_DOCUMENT';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  valueMasked: string | null;
  requestedAt: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  evidenceDeletedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentitySummary {
  trustLevel: IdentityTrustLevel;
  email: { verified: boolean; masked: string };
  phone: { verified: boolean; masked: string | null; verifiedAt: string | null };
  safety: {
    restrictedUntil: string | null;
    restrictionReason: string | null;
    suspendedUntil: string | null;
  };
  verifications: IdentityVerificationRecord[];
}

export interface IdUploadRequest {
  verificationId: string;
  uploadMode: 'direct_submit';
  submitUrl: string;
  fieldName: 'evidence';
  maxBytes: number;
  allowedMimeTypes: string[];
  expiresAt: string | null;
}

export const identityAPI = {
  getMe: async (): Promise<{ identity: IdentitySummary }> => {
    return apiClient.get('/identity/me');
  },
  verifyPhone: async (idToken: string): Promise<{ message: string; identity: IdentitySummary }> => {
    return apiClient.post('/identity/phone/verify', { idToken });
  },
  requestStudentEmail: async (studentEmail: string): Promise<{
    message: string;
    expiresAt: string;
    studentEmail: string;
  }> => {
    return apiClient.post('/identity/student-email/request', { studentEmail });
  },
  confirmStudentEmail: async (
    studentEmail: string,
    code: string
  ): Promise<{ message: string; identity: IdentitySummary }> => {
    return apiClient.post('/identity/student-email/confirm', { studentEmail, code });
  },
  requestIdUpload: async (): Promise<IdUploadRequest> => {
    return apiClient.post('/identity/id/request-upload', {});
  },
  submitIdProof: async (
    verificationId: string,
    file: File
  ): Promise<{ message: string; verificationId: string; status: string }> => {
    const formData = new FormData();
    formData.append('verificationId', verificationId);
    formData.append('evidence', file);
    return apiClient.post('/identity/id/submit', formData);
  },
};
