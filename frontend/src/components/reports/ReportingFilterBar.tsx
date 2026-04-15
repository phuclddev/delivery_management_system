import { Button, DatePicker, Segmented, Select, Space, Tag, Typography } from 'antd';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export type ReportingGranularity = 'daily' | 'weekly';

interface ReportingFilterBarProps {
  preset: string;
  month: number | undefined;
  range: [Dayjs, Dayjs] | null;
  granularity: ReportingGranularity;
  rangeLabel: string;
  onPresetChange: (value: string) => void;
  onMonthChange: (value: number | undefined) => void;
  onRangeChange: (value: [Dayjs, Dayjs] | null) => void;
  onGranularityChange: (value: ReportingGranularity) => void;
  onReset: () => void;
}

const presetOptions = [
  { label: 'Current Quarter', value: 'current_quarter' },
  { label: 'Current Month', value: 'current_month' },
  { label: 'Q1', value: 'q1' },
  { label: 'Q2', value: 'q2' },
  { label: 'Q3', value: 'q3' },
  { label: 'Q4', value: 'q4' },
];

const monthOptions = [
  { label: 'January', value: 0 },
  { label: 'February', value: 1 },
  { label: 'March', value: 2 },
  { label: 'April', value: 3 },
  { label: 'May', value: 4 },
  { label: 'June', value: 5 },
  { label: 'July', value: 6 },
  { label: 'August', value: 7 },
  { label: 'September', value: 8 },
  { label: 'October', value: 9 },
  { label: 'November', value: 10 },
  { label: 'December', value: 11 },
];

export function ReportingFilterBar({
  preset,
  month,
  range,
  granularity,
  rangeLabel,
  onPresetChange,
  onMonthChange,
  onRangeChange,
  onGranularityChange,
  onReset,
}: ReportingFilterBarProps) {
  return (
    <Space
      wrap
      size={[12, 12]}
      style={{
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '12px 0 4px',
      }}
    >
      <Space wrap size={[12, 12]}>
        <Select
          value={preset}
          options={presetOptions}
          style={{ width: 180 }}
          onChange={onPresetChange}
        />
        <Select
          allowClear
          placeholder="Month"
          value={month}
          options={monthOptions}
          style={{ width: 160 }}
          onChange={onMonthChange}
        />
        <RangePicker
          value={range}
          onChange={(value) => onRangeChange(value ? [value[0]!, value[1]!] : null)}
          allowClear
        />
        <Segmented
          value={granularity}
          options={[
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
          ]}
          onChange={(value) => onGranularityChange(value as ReportingGranularity)}
        />
        <Button onClick={onReset}>Reset</Button>
      </Space>

      <Space wrap>
        <Text type="secondary">Reporting range</Text>
        <Tag color="geekblue">{rangeLabel}</Tag>
      </Space>
    </Space>
  );
}
