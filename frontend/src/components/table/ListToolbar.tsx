import { Button, Checkbox, Popover, Select, Space } from 'antd';
import { DownloadOutlined, FilterOutlined, SettingOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface DynamicFilterDefinition {
  key: string;
  label: string;
  node: ReactNode;
}

export interface ConfigurableColumnDefinition {
  key: string;
  label: string;
  alwaysVisible?: boolean;
}

interface ListToolbarProps {
  filterDefinitions: DynamicFilterDefinition[];
  visibleFilterKeys: string[];
  onVisibleFilterKeysChange: (keys: string[]) => void;
  onApply?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  exporting?: boolean;
  columnDefinitions?: ConfigurableColumnDefinition[];
  visibleColumnKeys?: string[];
  onVisibleColumnKeysChange?: (keys: string[]) => void;
}

export function ListToolbar({
  filterDefinitions,
  visibleFilterKeys,
  onVisibleFilterKeysChange,
  onApply,
  onReset,
  onExport,
  exporting,
  columnDefinitions,
  visibleColumnKeys,
  onVisibleColumnKeysChange,
}: ListToolbarProps) {
  const selectedFilters = filterDefinitions.filter((item) => visibleFilterKeys.includes(item.key));
  const configurableColumns = (columnDefinitions ?? []).filter((item) => !item.alwaysVisible);
  const lockedColumns = (columnDefinitions ?? [])
    .filter((item) => item.alwaysVisible)
    .map((item) => item.key);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Select
          mode="multiple"
          style={{ minWidth: 260 }}
          placeholder="Visible filters"
          value={visibleFilterKeys}
          onChange={onVisibleFilterKeysChange}
          optionFilterProp="label"
          options={filterDefinitions.map((item) => ({
            label: item.label,
            value: item.key,
          }))}
          suffixIcon={<FilterOutlined />}
        />
        {onApply ? (
          <Button type="primary" onClick={onApply}>
            Apply Filters
          </Button>
        ) : null}
        {onReset ? <Button onClick={onReset}>Reset</Button> : null}
        {onExport ? (
          <Button icon={<DownloadOutlined />} onClick={onExport} loading={exporting}>
            Export CSV
          </Button>
        ) : null}
        {columnDefinitions && visibleColumnKeys && onVisibleColumnKeysChange ? (
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <Checkbox.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                value={visibleColumnKeys}
                options={configurableColumns.map((item) => ({
                  label: item.label,
                  value: item.key,
                }))}
                onChange={(checkedValues) =>
                  onVisibleColumnKeysChange([
                    ...lockedColumns,
                    ...checkedValues.map((value) => String(value)),
                  ])
                }
              />
            }
          >
            <Button icon={<SettingOutlined />}>Columns</Button>
          </Popover>
        ) : null}
      </Space>

      {selectedFilters.length > 0 ? <Space wrap>{selectedFilters.map((item) => (
        <div key={item.key}>{item.node}</div>
      ))}</Space> : null}
    </Space>
  );
}
