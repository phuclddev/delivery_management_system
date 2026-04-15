export interface CsvColumnDefinition<TRecord> {
  key: string;
  label: string;
  getValue: (record: TRecord) => unknown;
}

function escapeCsvValue(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString()
        : String(value);

  const escaped = normalized.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function downloadCsv<TRecord>(
  fileName: string,
  columns: CsvColumnDefinition<TRecord>[],
  records: TRecord[],
) {
  const rows = [
    columns.map((column) => escapeCsvValue(column.label)).join(','),
    ...records.map((record) =>
      columns.map((column) => escapeCsvValue(column.getValue(record))).join(','),
    ),
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function buildCsvFileName(baseName: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  return `${baseName}-${yyyy}${mm}${dd}.csv`;
}
