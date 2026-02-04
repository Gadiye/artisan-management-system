// hooks/usePriceHistory.ts
"use client"

import { useApi } from './useApi'
import { api } from '../lib/api'
import { PriceHistory } from '../lib/api/types'

export function usePriceHistory(productId?: number, params?: URLSearchParams) {
  const endpoint = productId
    ? `/products/${productId}/price-history/${params ? `?${params.toString()}` : ''}`
    : `/price-history/${params ? `?${params.toString()}` : ''}`;

  return useApi<PriceHistory[]>(endpoint);
}