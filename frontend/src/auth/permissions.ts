import type { CurrentUser } from '@/types/auth';

const permissionModules = [
  'teams',
  'requests',
  'projects',
  'allocations',
  'incidents',
  'artifacts',
  'leaves',
  'users',
  'roles',
  'permissions',
] as const;

const permissionActions = ['view', 'create', 'update', 'delete', 'manage'] as const;

type ModuleName = (typeof permissionModules)[number];
type ActionName = (typeof permissionActions)[number];

const allPermissions = permissionModules.flatMap((module) =>
  permissionActions.map((action) => `${module}:${action}`),
);

const pmPermissions = new Set(
  allPermissions.filter((permission) =>
    ['requests', 'projects', 'allocations', 'incidents', 'artifacts'].some((module) =>
      permission.startsWith(`${module}:`),
    ),
  ),
);

const devPermissions = new Set(
  allPermissions.filter((permission) => {
    const [module, action] = permission.split(':') as [ModuleName, ActionName];
    return (
      action === 'view' ||
      (['projects', 'artifacts', 'incidents'].includes(module) && action === 'update')
    );
  }),
);

const rolePermissionMap: Record<string, Set<string> | 'all'> = {
  super_admin: 'all',
  admin: 'all',
  pm: pmPermissions,
  dev: devPermissions,
  requester: new Set(['requests:create', 'requests:view_own', 'requests:update_own']),
};

export function getUserPermissions(user: CurrentUser | null): Set<string> | 'all' {
  if (!user) {
    return new Set<string>();
  }

  const aggregate = new Set<string>();

  for (const role of user.roles) {
    const permissions = rolePermissionMap[role.code];

    if (permissions === 'all') {
      return 'all';
    }

    if (permissions) {
      for (const permission of permissions) {
        aggregate.add(permission);
      }
    }
  }

  return aggregate;
}

export function userHasPermission(user: CurrentUser | null, permission: string): boolean {
  const permissions = getUserPermissions(user);
  return permissions === 'all' ? true : permissions.has(permission);
}
