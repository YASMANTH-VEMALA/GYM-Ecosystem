export const Roles = {
  SUPER_ADMIN: 'super_admin',
  GYM_OWNER: 'gym_owner',
  MANAGER: 'manager',
  RECEPTIONIST: 'receptionist',
  COACH: 'coach',
  MEMBER: 'member',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const RoleHierarchy: Record<Role, number> = {
  [Roles.SUPER_ADMIN]: 5,
  [Roles.GYM_OWNER]: 4,
  [Roles.MANAGER]: 3,
  [Roles.RECEPTIONIST]: 3,
  [Roles.COACH]: 2,
  [Roles.MEMBER]: 1,
};
