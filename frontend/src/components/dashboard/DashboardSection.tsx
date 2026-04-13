import type { PropsWithChildren, ReactNode } from 'react';
import { Space, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface DashboardSectionProps extends PropsWithChildren {
  title: string;
  description?: string;
  extra?: ReactNode;
}

export function DashboardSection({
  title,
  description,
  extra,
  children,
}: DashboardSectionProps) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div className="dashboard-section__header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {description ? (
            <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
              {description}
            </Paragraph>
          ) : null}
        </div>
        {extra ? <div>{extra}</div> : null}
      </div>
      {children}
    </Space>
  );
}

