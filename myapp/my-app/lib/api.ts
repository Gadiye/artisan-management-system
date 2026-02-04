import { PaginatedResponse, JobListEntry, ArtisanAdvance, AdvanceDeduction, ServiceRate } from '@/types'; // Assuming types are in @/types
import { CreateJobPayload } from './api/types'; // Import from local types file

// API configuration and base functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types based on your Django models
export interface Product {
  id: number
  product_type: string
  animal_type: string
  service_category: string
  size_category: string
  base_price: number
  is_active: boolean
  last_price_update: string
}

export interface Artisan {
  id: number
  name: string
  phone?: string
  is_active: boolean
  created_date: string
  total_earnings?: number
  pending_payment?: number
  average_rating?: number
  total_jobs?: number
  specialties?: string[]
  last_job_date?: string | null
}

export interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  created_date: string
  is_active: boolean
}

export interface JobDelivery {
  id: number;
  job_item: number;
  quantity_received: number;
  quantity_accepted: number;
  rejection_reason?: string | null;
  delivery_date: string;
  notes?: string | null;
}

export interface JobItem {
  id: number
  job: number
  artisan: number | { id: number; name: string } // Can be an object or just an ID
  product: number | { id: number; product_type: string; animal_type: string; service_category: string }
  quantity_ordered: number
  quantity_received: number
  quantity_accepted: number
  rejection_reason?: string
  original_amount: number
  final_payment: number
  payslip_generated: boolean
  deliveries?: JobDelivery[] // Add deliveries as optional field
}

export interface Job {
  job_id: number
  created_date: string
  created_by: string
  status: "IN_PROGRESS" | "PARTIALLY_RECEIVED" | "COMPLETED"
  status_display?: string
  service_category: string
  notes?: string
  total_cost: number
  total_final_payment: number
  items: JobItem[]
  artisans_involved?: string[]
}

export interface Order {
  order_id: number
  customer: number
  created_date: string
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  total_amount: number
  notes?: string
  items: OrderItem[]
}

export interface OrderItem {
  id: number
  order: number
  product: number
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Payslip {
  id: number
  artisan: { id: number; name: string }
  service_category?: string
  generated_date: string
  spreadsheet_file: string
  total_payment: string
  period_start: string
  period_end: string
  total_advances_deducted: string
}

export interface FinishedStock {
  id: number
  product: number
  quantity: number
  average_cost: number
  last_updated: string
}

export interface InventoryItem {
  id: number;
  product: {
    id: number;
    product_type: string;
    animal_type: string;
    size_category: string;
    unit_of_measure?: string;
  };
  service_category: string;
  quantity: number;
  average_cost: number;
  last_updated: string;
}

// NEW: PriceHistory Interface
export interface PriceHistory {
  id: number
  product: {
    id: number;
    product_type: string;
    animal_type: string;
    service_category: string;
  };
  old_price: number;
  new_price: number;
  effective_date: string; // ISO 8601 string
  changed_by: string;
  reason?: string;
}

// Delivery creation payload
export interface CreateDeliveryPayload {
  quantity_received: number
  quantity_accepted: number
  rejection_reason?: string
  notes?: string
}

// Generic API functions
export async function apiRequest<T>(endpoint: string, options: RequestInit & { responseType?: 'json' | 'blob' | 'text' } = {}): Promise<T> {
  // Ensure API_BASE_URL does not end with a slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  // Ensure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const url = `${baseUrl}${normalizedEndpoint}`

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  // Add CSRF token if available (for Django)
  const csrfToken = getCsrfToken()
  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(config.method?.toUpperCase() || "")) {
    config.headers = {
      ...config.headers,
      "X-CSRFToken": csrfToken,
    }
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      const errorBody = await response.json();
      // Try to find a 'detail' field first
      if (errorBody.detail) {
        errorMessage = errorBody.detail;
      }
      // Then check for common DRF field errors
      else if (typeof errorBody === 'object') {
        const fieldErrors = Object.keys(errorBody)
          .map(key => {
            const value = errorBody[key];
            if (Array.isArray(value) && value.length > 0) {
              return `${key}: ${value.join(', ')}`;
            } else {
              return `${key}: ${value}`; // For non-array values (e.g., if detail is directly mapped to a key)
            }
          })
          .join('; ');
        if (fieldErrors) {
          errorMessage = `Validation Error: ${fieldErrors}`;
        }
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content for DELETE requests
    if (response.status === 204) {
      return null as T; // Return null for void type
    }

    // Handle different response types
    if (options.responseType === 'blob') {
      return response.blob() as Promise<T>;
    }
    if (options.responseType === 'text') {
      return response.text() as Promise<T>;
    }
    // Default to JSON
    return await response.json()
  } catch (error) {
    console.error("API request failed:", error)
    throw error
  }
}

function getCsrfToken(): string | null {
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";")
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=")
      if (name === "csrftoken") {
        return value
      }
    }
  }
  return null
}

// API functions for each model
export const api = {
  // Products
  products: {
    list: (params?: URLSearchParams) => {
      const newParams = params || new URLSearchParams();
      if (!newParams.has('limit')) {
        newParams.set('limit', '100'); // Request up to 100 products
      }
      return apiRequest<{ results: Product[] }>(`/products/?${newParams.toString()}`).then(res => res.results);
    },
    get: (id: number) => apiRequest<Product>(`/products/${id}/`),
    create: (data: Partial<Product>) =>
      apiRequest<Product>("/products/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Product>) =>
      apiRequest<Product>(`/products/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/products/${id}/`, {
        method: "DELETE",
      }),
    // Nested price history for a product
    getPriceHistory: (productId: number, params?: URLSearchParams) =>
      apiRequest<PriceHistory[]>(`/products/${productId}/price-history/?${params?.toString() || ''}`),
    getMetadata: () => apiRequest<Record<string, unknown>>('/products/metadata/'),
    getPrice: (params: URLSearchParams) =>
      apiRequest<{ price: number }>(`/products/get_price/?${params.toString()}`),
  },

  // Artisans
  artisans: {
    list: () => apiRequest<PaginatedResponse<Artisan>>("/artisans/"),
    get: (id: number) => apiRequest<Artisan>(`/artisans/${id}/`),
    create: (data: Partial<Artisan>) =>
      apiRequest<Artisan>("/artisans/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Artisan>) =>
      apiRequest<Artisan>(`/artisans/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/artisans/${id}/`, {
        method: "DELETE",
      }),

  },

  // Customers
  customers: {
    list: () => apiRequest<Customer[]>("/customers/"),
    get: (id: number, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest<Customer>(`/customers/${id}/${query}`);
    },
    create: (data: Partial<Customer>) =>
      apiRequest<Customer>("/customers/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Customer>) =>
      apiRequest<Customer>(`/customers/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/customers/${id}/`, {
        method: "DELETE",
      }),
  },

  // Jobs
  jobs: {
    list: (params?: URLSearchParams) => apiRequest<PaginatedResponse<JobListEntry>>(`/jobs/?${params?.toString() || ''}`),
    get: (id: number) => apiRequest<Job>(`/jobs/${id}/`),
    create: (data: CreateJobPayload) =>
      apiRequest<Job>("/jobs/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Job>) =>
      apiRequest<Job>(`/jobs/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/jobs/${id}/`, {
        method: "DELETE",
      }),
    complete: (id: number, completionData: Record<string, unknown>) =>
      apiRequest<Job>(`/jobs/${id}/complete/`, {
        method: "POST",
        body: JSON.stringify(completionData),
      }),
    createItem: (jobId: number, item: Partial<JobItem>) =>
      apiRequest<JobItem>(`/jobs/${jobId}/items/`, {
        method: "POST",
        body: JSON.stringify(item),
      }),
    updateItem: (jobId: number, itemId: number, data: Partial<JobItem>) =>
      apiRequest<JobItem>(`/jobs/${jobId}/items/${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteItem: (jobId: number, itemId: number) =>
      apiRequest<void>(`/jobs/${jobId}/items/${itemId}/`, {
        method: "DELETE",
      }),
    // Delivery management
    createDelivery: (jobId: number, itemId: number, deliveryData: CreateDeliveryPayload) =>
      apiRequest<JobItem>(`/jobs/${jobId}/items/${itemId}/deliveries/`, {
        method: "POST",
        body: JSON.stringify(deliveryData),
      }),
    getDeliveries: (jobId: number, itemId: number) =>
      apiRequest<JobDelivery[]>(`/jobs/${jobId}/items/${itemId}/deliveries/`),
    updateDelivery: (jobId: number, itemId: number, deliveryId: number, data: Partial<JobDelivery>) =>
      apiRequest<JobDelivery>(`/jobs/${jobId}/items/${itemId}/deliveries/${deliveryId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteDelivery: (jobId: number, itemId: number, deliveryId: number) =>
      apiRequest<void>(`/jobs/${jobId}/items/${itemId}/deliveries/${deliveryId}/`, {
        method: "DELETE",
      }),
  },

  // Orders
  orders: {
    list: (params?: URLSearchParams) => apiRequest<Order[]>(`/orders/?${params?.toString() || ''}`),
    get: (id: number) => apiRequest<Order>(`/orders/${id}/`),
    create: (data: Partial<Order>) =>
      apiRequest<Order>("/orders/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Order>) =>
      apiRequest<Order>(`/orders/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/orders/${id}/`, {
        method: "DELETE",
      }),
    updateStatus: (id: number, status: string) =>
      apiRequest<Order>(`/orders/${id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    createItem: (orderId: number, item: Partial<OrderItem>) =>
      apiRequest<OrderItem>(`/orders/${orderId}/items/`, {
        method: "POST",
        body: JSON.stringify(item),
      }),
    updateItem: (orderId: number, itemId: number, data: Partial<OrderItem>) =>
      apiRequest<OrderItem>(`/orders/${orderId}/items/${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteItem: (orderId: number, itemId: number) =>
      apiRequest<void>(`/orders/${orderId}/items/${itemId}/`, {
        method: "DELETE",
      }),
  },

  // Financials (Payslips, Advances, Service Rates)
  financials: {
    payslips: {
      list: (params?: URLSearchParams) => apiRequest<Payslip[]>(`/financials/payslips/?${params?.toString() || ''}`),
      get: (id: number) => apiRequest<Payslip>(`/financials/payslips/${id}/`),
      generate: (data: {
        artisan_id?: number
        service_category?: string
        period_start: string
        period_end: string
      }) =>
        apiRequest<Payslip | Payslip[]>("/financials/payslips/generate/", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      downloadSpreadsheet: (id: number) =>
        apiRequest<Blob>(`/financials/payslips/${id}/download_spreadsheet/`, {
          headers: {},
          responseType: 'blob',
        }),
      delete: (id: number) =>
        apiRequest<void>(`/financials/payslips/${id}/`, {
          method: "DELETE",
        }),
    },
    advances: {
      list: (params?: URLSearchParams) => apiRequest<PaginatedResponse<ArtisanAdvance>>(`/financials/advances/?${params?.toString() || ''}`).then(res => res.results),
      get: (id: number) => apiRequest<ArtisanAdvance>(`/financials/advances/${id}/`),
      create: (data: Partial<ArtisanAdvance>) =>
        apiRequest<ArtisanAdvance>("/financials/advances/", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: number, data: Partial<ArtisanAdvance>) =>
        apiRequest<ArtisanAdvance>(`/financials/advances/${id}/`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      delete: (id: number) =>
        apiRequest<void>(`/financials/advances/${id}/`, {
          method: "DELETE",
        }),
      deduct: (id: number, amount: number, payslip_id?: number) =>
        apiRequest<ArtisanAdvance>(`/financials/advances/${id}/deduct/`, {
          method: "POST",
          body: JSON.stringify({ amount, payslip_id }),
        }),
      deductions: {
        list: (params?: URLSearchParams) => apiRequest<PaginatedResponse<AdvanceDeduction>>(`/financials/advance-deductions/?${params?.toString() || ''}`).then(res => res.results),
        get: (id: number) => apiRequest<AdvanceDeduction>(`/financials/advance-deductions/${id}/`),
        create: (data: Partial<AdvanceDeduction>) =>
          apiRequest<AdvanceDeduction>("/financials/advance-deductions/", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        delete: (id: number) =>
          apiRequest<void>(`/financials/advance-deductions/${id}/`, {
            method: "DELETE",
          }),
      },
    },
    serviceRates: {
      list: (params?: URLSearchParams) => apiRequest<PaginatedResponse<ServiceRate>>(`/financials/service-rates/?${params?.toString() || ''}`),
      get: (id: number) => apiRequest<ServiceRate>(`/financials/service-rates/${id}/`),
      create: (data: Partial<ServiceRate>) =>
        apiRequest<ServiceRate>("/financials/service-rates/", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: number, data: Partial<ServiceRate>) =>
        apiRequest<ServiceRate>(`/financials/service-rates/${id}/`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      delete: (id: number) =>
        apiRequest<void>(`/financials/service-rates/${id}/`, {
          method: "DELETE",
        }),
    },
  },



  // Finished Stock
  finishedStock: {
    list: (params?: URLSearchParams) => apiRequest<PaginatedResponse<FinishedStock>>(`/inventory/finished-stock/?${params?.toString() || ''}`).then(res => res.results),
    get: (id: number) => apiRequest<FinishedStock>(`/inventory/finished-stock/${id}/`),
    create: (data: Partial<FinishedStock>) =>
      apiRequest<FinishedStock>("/inventory/finished-stock/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<FinishedStock>) =>
      apiRequest<FinishedStock>(`/inventory/finished-stock/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/inventory/finished-stock/${id}/`, {
        method: "DELETE",
      }),
  },

  // Price History
  priceHistory: {
    list: (params?: URLSearchParams) => apiRequest<PriceHistory[]>(`/price-history/?${params?.toString() || ''}`),
    get: (id: number) => apiRequest<PriceHistory>(`/price-history/${id}/`),
    create: (data: Partial<PriceHistory>) =>
      apiRequest<PriceHistory>("/price-history/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<PriceHistory>) =>
      apiRequest<PriceHistory>(`/price-history/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    partialUpdate: (id: number, data: Partial<PriceHistory>) =>
      apiRequest<PriceHistory>(`/price-history/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/price-history/${id}/`, {
        method: "DELETE",
      }),
    getMetadata: () => apiRequest<Record<string, unknown>>('/price-history/metadata/'),
  },

  // Reports
  reports: {
    dashboard: () => apiRequest<Record<string, unknown>>("/reports/dashboard/"),
    production: (params?: URLSearchParams) =>
      apiRequest<Record<string, unknown>>(`/reports/production/?${params?.toString() || ''}`, {
        method: "GET",
      }),
    financial: (params?: URLSearchParams) =>
      apiRequest<Record<string, unknown>>(`/reports/financial/?${params?.toString() || ''}`, {
        method: "GET",
      }),
    artisan: (params?: URLSearchParams) =>
      apiRequest<Record<string, unknown>>(`/reports/artisan/?${params?.toString() || ''}`, {
        method: "GET",
      }),
    inventory: (params?: URLSearchParams) =>
      apiRequest<Record<string, unknown>>(`/reports/inventory/?${params?.toString() || ''}`, {
        method: "GET",
      }),
  },

  // Utility functions
  utils: {
    // Health check
    health: () => apiRequest<{ status: string }>("/health/"),
    // Get system metadata
    metadata: () => apiRequest<Record<string, unknown>>("/metadata/"),
    // Upload file (if needed)
    upload: (file: File, endpoint: string) => {
      const formData = new FormData();
      formData.append('file', file);

      return apiRequest<Record<string, unknown>>(endpoint, {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set content-type for FormData
      });
    },
  },



  // Inventory (non-finished stock)
  inventory: {
    list: (params?: URLSearchParams) => apiRequest<PaginatedResponse<InventoryItem>>(`/inventory/items/?${params?.toString() || ''}`).then(res => res.results),
    get: (id: number) => apiRequest<InventoryItem>(`/inventory/items/${id}/`),
    create: (data: Partial<InventoryItem>) =>
      apiRequest<InventoryItem>("/inventory/items/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<InventoryItem>) =>
      apiRequest<InventoryItem>(`/inventory/items/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/inventory/items/${id}/`, {
        method: "DELETE",
      }),
  },
};