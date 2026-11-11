/**
 * ApexERP Service Module - Four Official Roles Configuration
 *
 * Defines the 4 official operational roles, their demonstration profile details,
 * and their submodule route accessibility matrix.
 */

export const ROLES = {
  MANAGER: 'manager',
  COORDINATOR: 'coordinator',
  ENGINEER: 'engineer',
  EMPLOYEE: 'employee'
};

export const ROLE_DEFINITIONS = {
  [ROLES.MANAGER]: {
    id: ROLES.MANAGER,
    label: 'Manager',
    shortLabel: 'Manager',
    description: 'Complete visibility into service operations, performance, approvals, and escalations.',
    profile: {
      name: 'Service Manager',
      roleTitle: 'Manager',
      initials: 'SM',
      avatarBg: 'linear-gradient(135deg, #55258C 0%, #35145F 100%)'
    },
    accessibleRoutes: [
      '/dashboard',
      '/customers',
      '/customers/directory',
      '/customers/warranty-amc',
      '/inventory',
      '/spare-parts',
      '/service-requests',
      '/service-requests/work-assignment',
      '/service-execution',
      '/warranty-amc',
      '/service-billing',
      '/service-history',
      '/work-assignment',
      '/action-plan',
      '/action-plan/my-schedule',
      '/action-plan/team-schedule',
      '/action-plan/attendance',
      '/my-scheduled',
      '/team-schedule',
      '/reports'
    ]
  },
  [ROLES.COORDINATOR]: {
    id: ROLES.COORDINATOR,
    label: 'Coordinator',
    shortLabel: 'Coordinator',
    description: 'Service request management, engineer assignment, dispatch scheduling, and job tracking.',
    profile: {
      name: 'Service Coordinator',
      roleTitle: 'Coordinator',
      initials: 'SC',
      avatarBg: 'linear-gradient(135deg, #2868B2 0%, #1e4d82 100%)'
    },
    accessibleRoutes: [
      '/dashboard',
      '/customers',
      '/customers/directory',
      '/customers/warranty-amc',
      '/inventory',
      '/spare-parts',
      '/service-requests',
      '/service-requests/work-assignment',
      '/service-execution',
      '/warranty-amc',
      '/service-billing',
      '/service-history',
      '/work-assignment',
      '/action-plan',
      '/action-plan/my-schedule',
      '/action-plan/team-schedule',
      '/action-plan/attendance',
      '/my-scheduled',
      '/team-schedule',
      '/reports'
    ]
  },
  [ROLES.ENGINEER]: {
    id: ROLES.ENGINEER,
    label: 'Service Engineer',
    shortLabel: 'Engineer',
    description: 'Field service execution, assigned job resolution, diagnosis, and parts consumption recording.',
    profile: {
      name: 'Service Engineer',
      roleTitle: 'Service Engineer',
      initials: 'SE',
      avatarBg: 'linear-gradient(135deg, #0e7490 0%, #155e75 100%)'
    },
    accessibleRoutes: [
      '/dashboard',
      '/customers',
      '/customers/directory',
      '/customers/warranty-amc',
      '/inventory',
      '/spare-parts',
      '/service-requests',
      '/service-requests/work-assignment',
      '/service-execution',
      '/warranty-amc',
      '/service-billing',
      '/service-history',
      '/work-assignment',
      '/action-plan',
      '/action-plan/my-schedule',
      '/action-plan/attendance',
      '/my-scheduled',
      '/reports'
    ]
  },
  [ROLES.EMPLOYEE]: {
    id: ROLES.EMPLOYEE,
    label: 'Employee',
    shortLabel: 'Employee',
    description: 'Assigned service task viewing, status updating, requirements submission, and completion acknowledgment.',
    profile: {
      name: 'Service Employee',
      roleTitle: 'Employee',
      initials: 'EM',
      avatarBg: 'linear-gradient(135deg, #475569 0%, #334155 100%)'
    },
    accessibleRoutes: [
      '/dashboard',
      '/customers',
      '/customers/directory',
      '/customers/warranty-amc',
      '/inventory',
      '/spare-parts',
      '/service-requests',
      '/service-requests/work-assignment',
      '/service-execution',
      '/warranty-amc',
      '/service-billing',
      '/service-history',
      '/work-assignment',
      '/action-plan',
      '/action-plan/my-schedule',
      '/action-plan/attendance',
      '/my-scheduled',
      '/reports'
    ]
  }
};

export const ROLE_LIST = Object.values(ROLE_DEFINITIONS);

export const DEFAULT_ROLE = ROLES.MANAGER;
export const ROLE_STORAGE_KEY = 'apexerp_service_active_role';
