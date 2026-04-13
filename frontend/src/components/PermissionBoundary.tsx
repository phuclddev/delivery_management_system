import type { PropsWithChildren } from 'react';
import { Card, Result } from 'antd';

interface PermissionBoundaryProps extends PropsWithChildren {
  allowed: boolean;
  title?: string;
  subtitle?: string;
}

export function PermissionBoundary({
  allowed,
  title = 'You do not have access to this page',
  subtitle = 'Ask an administrator for the required permission if you need this module.',
  children,
}: PermissionBoundaryProps) {
  if (allowed) {
    return <>{children}</>;
  }

  return (
    <Card className="page-card" bordered={false}>
      <Result status="403" title={title} subTitle={subtitle} />
    </Card>
  );
}

