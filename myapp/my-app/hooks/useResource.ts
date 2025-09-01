// hooks/useResource.ts
import { useApi } from './useApi'
import { PaginatedResponse, Job, Artisan, Product, Customer, Order, FinishedStock, Payslip, ServiceRate, InventoryItem, HierarchicalRate } from '@/types'

/**
 * Creates a reusable hook for fetching a list of resources.
 * @param endpoint The API endpoint to fetch data from (e.g., '/artisans/').
 */
function createResourceHook<T>(endpoint: string) {
  return () => {
    // Use the SWR-powered useApi hook
    const { data, ...rest } = useApi<PaginatedResponse<T>>(endpoint);

    // Normalize paginated DRF response to a simple array
    const normalizedData = (data && typeof data === 'object' && 'results' in data) 
      ? (data as any).results 
      : data;

    return { data: normalizedData as T[], ...rest };
  }
}

// --- List Hooks ---
// These hooks now use SWR for caching, providing instant loads for previously fetched data.
export const useArtisans = createResourceHook<Artisan>("/artisans/");
export const useProducts = createResourceHook<Product>("/products/");
export const useCustomers = createResourceHook<Customer>("/customers/");
export const useJobs = createResourceHook<Job[]>("/jobs/");
export const useOrders = createResourceHook<Order>("/orders/");
export const useFinishedStock = createResourceHook<FinishedStock>("/inventory/finished-stock/");
export const usePayslips = createResourceHook<Payslip>("/payslips/");
export const useServiceRates = createResourceHook<ServiceRate>("/service-rates/");
export const useHierarchicalServiceRates = createResourceHook<HierarchicalRate[]>("/service-rates/hierarchical/");
export const useInventory = createResourceHook<InventoryItem>("/inventory/items/");
export const useProductsWithoutServiceRates = createResourceHook<Product>("/products/missing-service-rates/");


// --- Individual Resource Hooks ---
// These hooks fetch a single item by its ID.

/**
 * Fetches a single artisan by ID.
 * @param id The ID of the artisan. If null, the request is not made.
 */
export function useArtisan(id: number | null) {
  return useApi<Artisan>(id ? `/artisans/${id}/` : null);
}

/**
 * Fetches a single customer by ID.
 */
export function useCustomer(id: number | null) {
  return useApi<Customer>(id ? `/customers/${id}/` : null);
}

/**
 * Fetches a single job by ID.
 */
export function useJob(id: number | null) {
  return useApi<Job>(id ? `/jobs/${id}/` : null);
}

/**
 * Fetches a single product by ID.
 */
export function useProduct(id: number | null) {
  return useApi<Product>(id ? `/products/${id}/` : null);
}

/**
 * Fetches a single order by ID.
 */
export function useOrder(id: number | null) {
  return useApi<Order>(id ? `/orders/${id}/` : null);
}
