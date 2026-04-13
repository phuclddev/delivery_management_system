import type { ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';

const { Text, Title } = Typography;

interface DashboardMetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}

export function DashboardMetricCard({
  label,
  value,
  hint,
  icon,
}: DashboardMetricCardProps) {
  return (
    <Card className="dashboard-metric-card" bordered={false}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <div className="dashboard-metric-card__top">
          <Text className="dashboard-metric-card__label">{label}</Text>
          {icon ? <span className="dashboard-metric-card__icon">{icon}</span> : null}
        </div>
        <Title level={3} style={{ margin: 0 }}>
          {value}
        </Title>
        {hint ? <Text type="secondary">{hint}</Text> : null}
      </Space>
    </Card>
  );
}

