import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const { immediate = true, initialData = null, onSuccess, onError } = options;
  
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('حدث خطأ غير متوقع');
      setError(error);
      onError?.(error);
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, []);

  return { data, loading, error, refetch, setData };
}

// Helper to extract results from paginated responses
export function extractResults<T>(data: { results?: T[] } | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results || [];
}

// Multiple API calls hook
interface UseMultipleApiOptions {
  immediate?: boolean;
}

export function useMultipleApi<T extends Record<string, () => Promise<unknown>>>(
  fetchers: T,
  options: UseMultipleApiOptions = {}
): {
  data: { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { immediate = true } = options;
  const keys = Object.keys(fetchers) as (keyof T)[];
  
  const [data, setData] = useState<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }>(
    () => keys.reduce((acc, key) => ({ ...acc, [key]: null }), {} as { [K in keyof T]: null })
  );
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        keys.map(async (key) => {
          try {
            return await fetchers[key]();
          } catch {
            return null;
          }
        })
      );
      const newData = keys.reduce((acc, key, index) => ({
        ...acc,
        [key]: results[index],
      }), {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> | null });
      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('حدث خطأ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, []);

  return { data, loading, error, refetch };
}
