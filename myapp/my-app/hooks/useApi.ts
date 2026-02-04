// hooks/useApi.ts
import useSWR from 'swr'
import { apiRequest } from '../lib/api'

// A generic fetcher function that uses our apiRequest
// SWR will pass the key (the URL endpoint) to this fetcher.
const fetcher = async <T>(url: string): Promise<T> => apiRequest(url) as Promise<T>;

export function useApi<T>(
  endpoint: string | null, // The API endpoint (URL) to fetch
  swrOptions?: any // Optional SWR configuration
) {
  // useSWR will automatically cache the data based on the endpoint key.
  // It returns the cached data immediately, then re-fetches in the background.
  const { data, error, mutate, isLoading } = useSWR<T>(endpoint, fetcher, swrOptions);

  const post = async (data: any) => {
    if (!endpoint) throw new Error('Endpoint is null');
    return await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(data) });
  };

  const put = async (data: any) => {
    if (!endpoint) throw new Error('Endpoint is null');
    return await apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  };

  const del = async () => {
    if (!endpoint) throw new Error('Endpoint is null');
    return await apiRequest(endpoint, { method: 'DELETE' });
  };

  return {
    data,
    error: error ? error.message : null,
    loading: isLoading,
    refetch: mutate, // SWR's mutate function can be used to manually re-trigger a fetch
    post,
    put,
    del,
  }
}