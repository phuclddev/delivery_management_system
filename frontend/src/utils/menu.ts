import type { MenuProps } from 'antd';
import type { NavigationItem } from '@/types/navigation';

export function toMenuItems(items: NavigationItem[]): MenuProps['items'] {
  return items.map((item) => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
  }));
}

