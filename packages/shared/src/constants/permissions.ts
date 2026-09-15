import { Role, Roles } from './roles';

export const Permissions = {
  // Gym management
  GYM_READ: 'gym:read',
  GYM_UPDATE: 'gym:update',

  // Members
  MEMBER_CREATE: 'member:create',
  MEMBER_READ: 'member:read',
  MEMBER_UPDATE: 'member:update',
  MEMBER_DELETE: 'member:delete',

  // Plans
  PLAN_CREATE: 'plan:create',
  PLAN_READ: 'plan:read',
  PLAN_UPDATE: 'plan:update',
  PLAN_DELETE: 'plan:delete',

  // Subscriptions
  SUBSCRIPTION_CREATE: 'subscription:create',
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_UPDATE: 'subscription:update',

  // Check-ins
  CHECKIN_CREATE: 'checkin:create',
  CHECKIN_READ: 'checkin:read',

  // Payments
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_READ: 'payment:read',

  // Workouts & Diet
  WORKOUT_CREATE: 'workout:create',
  WORKOUT_READ: 'workout:read',
  WORKOUT_UPDATE: 'workout:update',
  WORKOUT_ASSIGN: 'workout:assign',
  DIET_CREATE: 'diet:create',
  DIET_READ: 'diet:read',
  DIET_UPDATE: 'diet:update',
  DIET_ASSIGN: 'diet:assign',

  // Staff
  STAFF_CREATE: 'staff:create',
  STAFF_READ: 'staff:read',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // Notifications
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_READ: 'notification:read',

  // Settings
  SETTINGS_UPDATE: 'settings:update',
  BILLING_READ: 'billing:read',
  BILLING_UPDATE: 'billing:update',

  // SaaS (super admin)
  SAAS_MANAGE: 'saas:manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<Role, Permission[]> = {
  [Roles.SUPER_ADMIN]: Object.values(Permissions),

  [Roles.GYM_OWNER]: [
    Permissions.GYM_READ,
    Permissions.GYM_UPDATE,
    Permissions.MEMBER_CREATE,
    Permissions.MEMBER_READ,
    Permissions.MEMBER_UPDATE,
    Permissions.MEMBER_DELETE,
    Permissions.PLAN_CREATE,
    Permissions.PLAN_READ,
    Permissions.PLAN_UPDATE,
    Permissions.PLAN_DELETE,
    Permissions.SUBSCRIPTION_CREATE,
    Permissions.SUBSCRIPTION_READ,
    Permissions.SUBSCRIPTION_UPDATE,
    Permissions.CHECKIN_CREATE,
    Permissions.CHECKIN_READ,
    Permissions.PAYMENT_CREATE,
    Permissions.PAYMENT_READ,
    Permissions.WORKOUT_CREATE,
    Permissions.WORKOUT_READ,
    Permissions.WORKOUT_UPDATE,
    Permissions.WORKOUT_ASSIGN,
    Permissions.DIET_CREATE,
    Permissions.DIET_READ,
    Permissions.DIET_UPDATE,
    Permissions.DIET_ASSIGN,
    Permissions.STAFF_CREATE,
    Permissions.STAFF_READ,
    Permissions.STAFF_UPDATE,
    Permissions.STAFF_DELETE,
    Permissions.ANALYTICS_READ,
    Permissions.NOTIFICATION_SEND,
    Permissions.NOTIFICATION_READ,
    Permissions.SETTINGS_UPDATE,
    Permissions.BILLING_READ,
    Permissions.BILLING_UPDATE,
  ],

  [Roles.MANAGER]: [
    Permissions.GYM_READ,
    Permissions.MEMBER_CREATE,
    Permissions.MEMBER_READ,
    Permissions.MEMBER_UPDATE,
    Permissions.PLAN_READ,
    Permissions.SUBSCRIPTION_CREATE,
    Permissions.SUBSCRIPTION_READ,
    Permissions.SUBSCRIPTION_UPDATE,
    Permissions.CHECKIN_CREATE,
    Permissions.CHECKIN_READ,
    Permissions.PAYMENT_CREATE,
    Permissions.PAYMENT_READ,
    Permissions.WORKOUT_CREATE,
    Permissions.WORKOUT_READ,
    Permissions.WORKOUT_UPDATE,
    Permissions.WORKOUT_ASSIGN,
    Permissions.DIET_CREATE,
    Permissions.DIET_READ,
    Permissions.DIET_UPDATE,
    Permissions.DIET_ASSIGN,
    Permissions.ANALYTICS_READ,
    Permissions.NOTIFICATION_SEND,
    Permissions.NOTIFICATION_READ,
  ],

  [Roles.RECEPTIONIST]: [
    Permissions.MEMBER_CREATE,
    Permissions.MEMBER_READ,
    Permissions.MEMBER_UPDATE,
    Permissions.PLAN_READ,
    Permissions.SUBSCRIPTION_CREATE,
    Permissions.SUBSCRIPTION_READ,
    Permissions.CHECKIN_CREATE,
    Permissions.CHECKIN_READ,
    Permissions.PAYMENT_CREATE,
    Permissions.PAYMENT_READ,
    Permissions.WORKOUT_READ,
    Permissions.DIET_READ,
    Permissions.NOTIFICATION_SEND,
  ],

  [Roles.COACH]: [
    Permissions.MEMBER_READ,
    Permissions.WORKOUT_CREATE,
    Permissions.WORKOUT_READ,
    Permissions.WORKOUT_UPDATE,
    Permissions.WORKOUT_ASSIGN,
    Permissions.DIET_CREATE,
    Permissions.DIET_READ,
    Permissions.DIET_UPDATE,
    Permissions.DIET_ASSIGN,
  ],

  [Roles.MEMBER]: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return RolePermissions[role].includes(permission);
}
