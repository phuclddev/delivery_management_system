import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import {
  type DataProviderError,
  type DataResource,
  useDataProvider,
} from '@/providers/dataProvider';

interface UseCrudTableOptions<TRecord> {
  resource: DataResource;
  initialPageSize?: number;
  initialFilters?: Record<string, unknown>;
  initialSort?: {
    field?: string;
    order?: 'ascend' | 'descend';
  };
  mapData?: (items: unknown[]) => TRecord[];
}

export function useCrudTable<TRecord>({
  resource,
  initialPageSize = 10,
  initialFilters = {},
  initialSort,
  mapData,
}: UseCrudTableOptions<TRecord>) {
  const provider = useDataProvider();
  const [rows, setRows] = useState<TRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DataProviderError | null>(null);
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
    showSizeChanger: true,
  });
  const [sorter, setSorter] = useState<SorterResult<TRecord>>({
    field: initialSort?.field,
    order: initialSort?.order,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await provider.getList<TRecord>({
        resource,
        filters,
        pagination: {
          current: pagination.current ?? 1,
          pageSize: pagination.pageSize ?? initialPageSize,
        },
        sort:
          typeof sorter.field === 'string'
            ? {
                field: sorter.field,
                order: sorter.order ?? undefined,
              }
            : undefined,
      });

      setRows(mapData ? mapData(result.data as unknown[]) : result.data);
      setPagination((current) => ({
        ...current,
        current: result.page,
        pageSize: result.pageSize,
        total: result.total,
      }));
    } catch (caughtError) {
      setError(caughtError as DataProviderError);
      setRows([]);
      setPagination((current) => ({
        ...current,
        total: 0,
      }));
    } finally {
      setLoading(false);
    }
  }, [
    filters,
    initialPageSize,
    mapData,
    pagination.current,
    pagination.pageSize,
    provider,
    resource,
    sorter.field,
    sorter.order,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const updateFilters = useCallback((nextFilters: Record<string, unknown>) => {
    setFilters(nextFilters);
    setPagination((current) => ({
      ...current,
      current: 1,
    }));
  }, []);

  const handleTableChange = useCallback(
    (nextPagination: TablePaginationConfig, _: unknown, nextSorter: SorterResult<TRecord> | SorterResult<TRecord>[]) => {
      setPagination((current) => ({
        ...current,
        current: nextPagination.current,
        pageSize: nextPagination.pageSize,
      }));

      if (!Array.isArray(nextSorter)) {
        setSorter(nextSorter);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      rows,
      loading,
      error,
      filters,
      pagination,
      sorter,
      setFilters: updateFilters,
      handleTableChange,
      refresh,
      provider,
    }),
    [
      error,
      filters,
      handleTableChange,
      loading,
      pagination,
      provider,
      refresh,
      rows,
      sorter,
      updateFilters,
    ],
  );
}
