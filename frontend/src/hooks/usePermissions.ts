import { useCallback, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { getUserPermissions, userHasPermission } from '@/auth/permissions';

export function usePermissions() {
  const { user } = useAuth();

  const permissionSet = useMemo(() => getUserPermissions(user), [user]);
  const hasPermission = useCallback(
    (permission: string) => userHasPermission(user, permission),
    [user],
  );

  return {
    permissions: permissionSet,
    hasPermission,
  };
}
