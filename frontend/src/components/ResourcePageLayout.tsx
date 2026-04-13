import type { PropsWithChildren, ReactNode } from 'react';
import { Card, Space } from 'antd';

interface ResourcePageLayoutProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function ResourcePageLayout({
  eyebrow,
  title,
  description,
  actions,
  filters,
  children,
}: ResourcePageLayoutProps) {
  return (
    <Card className="page-card resource-page-card" bordered={false}>
      <div className="page-header resource-page-header">
        <div>
          <span className="page-header__eyebrow">{eyebrow}</span>
          <h1 className="page-header__title">{title}</h1>
          <p className="page-header__description">{description}</p>
        </div>
        {actions ? <div className="resource-page-header__actions">{actions}</div> : null}
      </div>

      {filters ? <div className="resource-page-filters">{filters}</div> : null}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {children}
      </Space>
    </Card>
  );
}

