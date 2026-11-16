import { apiClient } from './client';

export const salesApi = {
  listCustomers: (q?: string) => apiClient.get<any[]>(`/sales/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createCustomer: (payload: Record<string, any>) => apiClient.post<any>('/sales/customers', payload),
  updateCustomer: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/sales/customers/${id}`, payload),
  updateCustomerCredit: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/sales/customers/${id}/credit`, payload),
  listProducts: () => apiClient.get<any[]>('/sales/products'),
  getInventorySummary: () => apiClient.get<{ warehouses: any[]; batches: any[]; regions: any[] }>('/sales/inventory/summary'),

  listLeads: () => apiClient.get<any[]>('/sales/leads'),
  createLead: (payload: Record<string, any>) => apiClient.post<any>('/sales/leads', payload),
  decideLead: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/sales/leads/${id}/decide`, payload),

  listOpportunities: () => apiClient.get<any[]>('/sales/opportunities'),
  createOpportunity: (payload: Record<string, any>) => apiClient.post<any>('/sales/opportunities', payload),
  updateOpportunityStage: (id: string, payload: Record<string, any>) =>
    apiClient.patch<any>(`/sales/opportunities/${id}/stage`, payload),

  listFollowUps: () => apiClient.get<any[]>('/sales/followups'),
  createFollowUp: (payload: Record<string, any>) => apiClient.post<any>('/sales/followups', payload),

  listQuotations: () => apiClient.get<any[]>('/sales/quotations'),
  createQuotation: (payload: Record<string, any>) => apiClient.post<any>('/sales/quotations', payload),
  updateQuotation: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/sales/quotations/${id}`, payload),
  approveQuotation: (id: string, reason?: string) => apiClient.post<any>(`/sales/quotations/${id}/approve`, { reason }),
  rejectQuotation: (id: string, reason?: string) => apiClient.post<any>(`/sales/quotations/${id}/reject`, { reason }),

  listOrders: () => apiClient.get<any[]>('/sales/orders'),
  createOrder: (payload: Record<string, any>) => apiClient.post<any>('/sales/orders', payload),
  cancelOrder: (id: string, reason?: string) => apiClient.post<any>(`/sales/orders/${id}/cancel`, { reason }),
  approveOrderDiscount: (id: string, reason?: string) => apiClient.post<any>(`/sales/orders/${id}/approve-discount`, { reason }),
  rejectOrderDiscount: (id: string, reason?: string) => apiClient.post<any>(`/sales/orders/${id}/reject-discount`, { reason }),
  dispatchOrder: (id: string, payload?: Record<string, any>) => apiClient.post<any>(`/sales/orders/${id}/dispatch`, payload || {}),
  handoverOrderToService: (id: string, payload?: Record<string, any>) =>
    apiClient.post<any>(`/sales/orders/${id}/handover-service`, payload || {}),

  listDispatchesAndReturns: () => apiClient.get<{ dispatches: any[]; returns: any[] }>('/sales/dispatches'),
  createReturn: (payload: Record<string, any>) => apiClient.post<any>('/sales/returns', payload),
};
