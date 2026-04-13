import type { ItemType } from 'antd/es/menu/interface';
import type { ReactNode } from 'react';

export interface NavigationItem {
  key: string;
  path: string;
  label: string;
  icon: ReactNode;
}

export type SidebarMenuItem = ItemType;

