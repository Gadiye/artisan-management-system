// hooks/useProductPrice.ts
"use client"

import { useApi } from './useApi'
import { api } from '../lib/api'
import { Product } from '../lib/api/types'

export function useProductPrice(
  productType?: string,
  animalType?: string,
  sizeCategory?: string,
  serviceCategory?: string,
  options?: { immediate?: boolean; enabled?: boolean }
) {
  const params = new URLSearchParams()
  if (productType) params.append("product_type", productType)
  if (animalType) params.append("animal_type", animalType)
  if (sizeCategory) params.append("size_category", sizeCategory)
  if (serviceCategory) params.append("service_category", serviceCategory)

  const enabled =
    !!(options?.enabled !== false &&
      productType &&
      animalType &&
      serviceCategory)

  const endpointUrl = enabled
    ? `/products/get_price/?${params.toString()}`
    : null;

  return useApi<Product>(
    endpointUrl,
    {
      ...options,
      immediate: options?.immediate !== false && enabled,
      fetcher: (url: string) => {
        const fetchParams = new URLSearchParams(url.split('?')[1]);
        return api.products.getPrice(fetchParams);
      },
    }
  )
}
