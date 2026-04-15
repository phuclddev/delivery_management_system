import { Select } from 'antd';
import type { SelectProps } from 'antd';

type ProjectOption = {
  value: string;
  label: string;
};

type ProjectPickerProps = Omit<SelectProps, 'options'> & {
  options: ProjectOption[];
};

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export function ProjectPicker({
  options,
  showSearch,
  optionFilterProp,
  ...props
}: ProjectPickerProps) {
  return (
    <Select
      {...props}
      options={options}
      showSearch={showSearch ?? true}
      optionFilterProp={optionFilterProp ?? 'label'}
      filterOption={(input, option) => {
        const label =
          typeof option?.label === 'string'
            ? option.label
            : typeof option?.value === 'string'
              ? option.value
              : '';

        return normalizeSearchText(label).includes(normalizeSearchText(input));
      }}
    />
  );
}
