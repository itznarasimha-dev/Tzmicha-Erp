import { apiClient, setAuthToken } from './client';

export interface AuthSessionResponse {
  token: string;
  user: Record<string, any>;
  organization: Record<string, any>;
}

export const authApi = {
  async login(payload: { email: string; password?: string; teamId?: string; demoLogin?: boolean }) {
    const data = await apiClient.post<AuthSessionResponse>('/auth/login', payload);
    if (data?.token) {
      setAuthToken(data.token);
    }
    return data;
  },
  async registerOrganization(payload: Record<string, any>) {
    const data = await apiClient.post<AuthSessionResponse>('/auth/register-org', payload);
    if (data?.token) {
      setAuthToken(data.token);
    }
    return data;
  },
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },
  getMe: () => apiClient.get<{ user: any; organization: any; regions: any[]; permissions: string[] }>('/me'),
  listUsers: () => apiClient.get<any[]>('/users'),
  createUser: (payload: Record<string, any>) => apiClient.post<any>('/users', payload),
  updateUser: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/users/${id}`, payload),
};
