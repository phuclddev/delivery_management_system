import type { PropsWithChildren, ReactNode } from 'react';
import { Card, Empty, Skeleton } from 'antd';

interface DashboardPanelProps extends PropsWithChildren {
  title: string;
  extra?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyDescription?: string;
  minHeight?: number;
}

export function DashboardPanel({
  title,
  extra,
  loading,
  empty,
  emptyDescription = 'No data available',
  minHeight = 320,
  children,
}: DashboardPanelProps) {
  return (
    <Card
      className="dashboard-panel"
      bordered={false}
      title={title}
      extra={extra}
      styles={{ body: { minHeight } }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : empty ? (
        <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        children
      )}
    </Card>
  );
}

