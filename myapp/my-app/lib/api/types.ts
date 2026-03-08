// lib/api/types.ts
export interface Product {
  id: number
  product_type: string
  animal_type: string
  service_category: string
  size_category: string
  base_price: number
  service_rate_per_unit: number; // Added this field
  is_active: boolean
  last_price_update: string
  unit_of_measure: string; // Added this field
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



export interface JobItem {
  id: number
  job: number
  artisan: number | { id: number; name: string } // Can be an object or just an ID
  product: number | { id: number; product_type: string; animal_type: string; service_category: string };
  quantity_ordered: number
  quantity_received: number
  quantity_accepted: number
  rejection_reason?: string
  original_amount: number
  final_payment: number
  payslip_generated: boolean
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
  artisan: number
  service_category?: string
  generated_date: string
  pdf_file: string
  total_payment: number
  period_start: string
  period_end: string
}

export interface FinishedStock {
  id: number
  product: number
  quantity: number
  average_cost: number
  last_updated: string
}

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
  effective_date: string;
  changed_by: string;
  reason?: string;
}

export interface ProductPriceDetails {
  id: number;
  price: number;
  service_rate_per_unit?: number;
  unit_of_measure?: string;
}

// Job creation payloads
export interface JobItemPayload {
  artisan: number;
  product: number; // Added product ID
  quantity_ordered: number; // Renamed from quantity
  // Optional fields for UI/Debugging
  product_type?: string;
  animal_type?: string;
  size_category?: string;
  unit_price?: number;
  total_price?: number;
}

export interface CreateJobPayload {
  service_category: string;
  notes?: string;
  bypass_inventory_deduction?: boolean;
  items: JobItemPayload[];
}

export interface ServiceRate {
  id: number;
  product: {
    id: number;
    product_type: string;
    animal_type: string;
    base_price: string;
  };
  service_category: string;
  rate_per_unit: number;
}