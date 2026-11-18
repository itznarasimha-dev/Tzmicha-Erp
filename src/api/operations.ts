import { apiClient } from './client';

export const operationsApi = {
  getAttendanceAndLeaves: () => apiClient.get<{ policy: any; records: any[]; leaves: any[]; workUpdates: any[] }>('/attendance'),
  checkIn: (payload?: Record<string, any>) => apiClient.post<any>('/attendance/check-in', payload || {}),
  checkOut: (notes?: string) => apiClient.post<any>('/attendance/check-out', { notes }),

  createLeave: (payload: Record<string, any>) => apiClient.post<any>('/leaves', payload),
  approveLeave: (id: string, decisionNote?: string) => apiClient.post<any>(`/leaves/${id}/approve`, { decisionNote }),
  rejectLeave: (id: string, decisionNote?: string) => apiClient.post<any>(`/leaves/${id}/reject`, { decisionNote }),

  createWorkUpdate: (payload: Record<string, any>) => apiClient.post<any>('/work-updates', payload),

  listExpenses: () => apiClient.get<{ claims: any[]; budgets: any[] }>('/expenses'),
  createExpense: (payload: Record<string, any>) => apiClient.post<any>('/expenses', payload),
  approveExpense: (id: string, reason?: string) => apiClient.post<any>(`/expenses/${id}/approve`, { reason }),
  rejectExpense: (id: string, reason?: string) => apiClient.post<any>(`/expenses/${id}/reject`, { reason }),
  payExpense: (id: string) => apiClient.post<any>(`/expenses/${id}/pay`),

  listApprovalsAndQueries: () => apiClient.get<{ approvals: any[]; queries: any[]; auditLogs: any[] }>('/approvals'),
  approveRequest: (id: string, decisionNote?: string) => apiClient.post<any>(`/approvals/${id}/approve`, { decisionNote }),
  rejectRequest: (id: string, decisionNote?: string) => apiClient.post<any>(`/approvals/${id}/reject`, { decisionNote }),

  getAdminOverview: () => apiClient.get<any>('/admin/overview'),
};
