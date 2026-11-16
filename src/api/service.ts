import { apiClient } from './client';

export const serviceApi = {
  getOverview: () => apiClient.get<any>('/service/overview'),
  listRequests: () => apiClient.get<any[]>('/service/requests'),
  createRequest: (payload: Record<string, any>) => apiClient.post<any>('/service/requests', payload),
  triageRequest: (id: string, payload: Record<string, any>) => apiClient.post<any>(`/service/requests/${id}/triage`, payload),
  escalateRequest: (id: string, payload: Record<string, any>) => apiClient.post<any>(`/service/requests/${id}/escalate`, payload),
  resolveEscalation: (id: string, payload: Record<string, any>) => apiClient.post<any>(`/service/escalations/${id}/resolve`, payload),

  createAssignment: (payload: Record<string, any>) => apiClient.post<any>('/service/assignments', payload),
  updateAssignment: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/service/assignments/${id}`, payload),

  recordExecution: (payload: Record<string, any>) => apiClient.post<any>('/service/executions', payload),
  updateSparePart: (id: string, payload: Record<string, any>) => apiClient.patch<any>(`/service/spare-parts/${id}`, payload),

  createRequisition: (payload: Record<string, any>) => apiClient.post<any>('/service/requisitions', payload),
  transitionRequisition: (id: string, payload: Record<string, any>) =>
    apiClient.post<any>(`/service/requisitions/${id}/transition`, payload),

  createWarranty: (payload: Record<string, any>) => apiClient.post<any>('/service/warranties', payload),
  createAmc: (payload: Record<string, any>) => apiClient.post<any>('/service/amc', payload),

  requestWarrantyExemption: (payload: Record<string, any>) => apiClient.post<any>('/service/warranty-exemptions', payload),
  approveWarrantyExemption: (id: string, decisionNote?: string) =>
    apiClient.post<any>(`/service/warranty-exemptions/${id}/approve`, { decisionNote }),
  rejectWarrantyExemption: (id: string, decisionNote?: string) =>
    apiClient.post<any>(`/service/warranty-exemptions/${id}/reject`, { decisionNote }),

  approveServiceBilling: (invoiceId: string, decisionNote?: string) =>
    apiClient.post<any>(`/service/billing/${invoiceId}/approve-service`, { decisionNote }),
  rejectServiceBilling: (invoiceId: string, decisionNote?: string) =>
    apiClient.post<any>(`/service/billing/${invoiceId}/reject-service`, { decisionNote }),

  createSparePartProposal: (payload: Record<string, any>) =>
    apiClient.post<any>('/service/spare-part-proposals', payload),
  decideSparePartProposal: (id: string, payload: Record<string, any>) =>
    apiClient.post<any>(`/service/spare-part-proposals/${id}/decide`, payload),

  renewAmc: (id: string, payload: Record<string, any>) =>
    apiClient.post<any>(`/service/amc/${id}/renew`, payload),
  schedulePreventiveVisit: (payload: Record<string, any>) =>
    apiClient.post<any>('/service/preventive-visits', payload),
};
