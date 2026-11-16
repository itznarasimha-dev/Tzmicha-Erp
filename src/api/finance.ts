import { apiClient } from './client';

export const financeApi = {
  listInvoices: (source?: string) =>
    apiClient.get<any[]>(`/finance/invoices${source ? `?source=${encodeURIComponent(source)}` : ''}`),
  createInvoice: (payload: Record<string, any>) => apiClient.post<any>('/finance/invoices', payload),
  approveInvoice: (id: string, reason?: string) => apiClient.post<any>(`/finance/invoices/${id}/approve`, { reason }),
  rejectInvoice: (id: string, reason?: string) => apiClient.post<any>(`/finance/invoices/${id}/reject`, { reason }),

  listPayments: () => apiClient.get<any[]>('/finance/payments'),
  recordPayment: (payload: Record<string, any>) => apiClient.post<any>('/finance/payments', payload),
  verifyPayment: (id: string, reason?: string) => apiClient.post<any>(`/finance/payments/${id}/verify`, { reason }),
  flagPayment: (id: string, reason?: string) => apiClient.post<any>(`/finance/payments/${id}/flag`, { reason }),

  getLedgers: () =>
    apiClient.get<{
      refundClaims: any[];
      commissionPolicies: any[];
      settlements: any[];
      journalEntries: any[];
      accounts: any[];
    }>('/finance/ledgers'),
  createIncentiveSettlement: (payload: Record<string, any>) => apiClient.post<any>('/finance/incentives', payload),
};
