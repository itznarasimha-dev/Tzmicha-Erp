/**
 * Development-only demo access configuration.
 * These credentials do not authenticate against any real service.
 * No backend, directory, or identity provider is connected.
 */
export const DEMO_MODE = true as const

export const DEMO_CREDENTIALS = {
  email: 'ananya.rao@totallyerp.demo',
  employeeId: 'TOT-MKT-0142',
  password: 'Totally@2026',
  name: 'Ananya Rao',
  role: 'Marketing Executive',
  department: 'Marketing',
} as const

export const DEMO_STORAGE_PREFIX = 'totally-erp-marketing'
export const SESSION_KEY = `${DEMO_STORAGE_PREFIX}-session`
export const THEME_KEY = `${DEMO_STORAGE_PREFIX}-theme`
export const DATA_KEY = `${DEMO_STORAGE_PREFIX}-data-v1`
export const DEMO_ROLE_KEY = `${DEMO_STORAGE_PREFIX}-preview-role`
