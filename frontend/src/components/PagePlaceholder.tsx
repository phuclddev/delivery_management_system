import { Card, Tag } from 'antd';
import type { PlaceholderListItem, PlaceholderMetric } from '@/types/page';

interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  metrics: PlaceholderMetric[];
  items: PlaceholderListItem[];
}

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  metrics,
  items,
}: PagePlaceholderProps) {
  return (
    <Card className="page-card" bordered={false}>
      <div className="page-header">
        <span className="page-header__eyebrow">{eyebrow}</span>
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__description">{description}</p>
      </div>

      <div className="placeholder-grid">
        {metrics.map((metric) => (
          <div className="placeholder-stat" key={metric.label}>
            <div className="placeholder-stat__label">{metric.label}</div>
            <div className="placeholder-stat__value">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="placeholder-list">
        {items.map((item) => (
          <div className="placeholder-list__item" key={`${item.title}-${item.value}`}>
            <div>
              <div>{item.title}</div>
              <div className="placeholder-list__meta">{item.meta}</div>
            </div>
            <Tag color="cyan">{item.value}</Tag>
          </div>
        ))}
      </div>
    </Card>
  );
}

