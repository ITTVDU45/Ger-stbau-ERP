export type UserRole = 'ADMIN' | 'GUTACHTER' | 'PARTNER';

export const RBAC = {
  ADMIN: [
    'cases:read',
    'cases:write',
    'cases:delete',
    'status:update',
    'users:manage',
    'partners:manage',
    'billing:manage',
    'referrals:manage',
    'docs:manage'
  ],
  GUTACHTER: [
    'cases:read:own',
    'cases:update:own',
    'docs:upload',
    'docs:read:own',
    'billing:view:own',
    'tasks:manage:own'
  ],
  PARTNER: [
    'referrals:read:own',
    'cases:read:referenced',
    'billing:view:own',
    'docs:read:referenced'
  ],
} as const;

export function can(role: UserRole, permission: string): boolean {
  return RBAC[role as keyof typeof RBAC]?.includes(permission as any) ?? false;
}

export function getRolePermissions(role: UserRole): string[] {
  return RBAC[role as keyof typeof RBAC] ?? [];
}

export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  return permissions.some(perm => can(role, perm));
}
