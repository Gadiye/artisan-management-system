// lib/api/base.ts
import { apiRequest } from './client'

export function createCrudApi<T, P = unknown>(endpoint: string) {
  return {
    list: (params?: URLSearchParams) =>
      apiRequest<P>(`/${endpoint}/?${params?.toString() || ''}`),

    get: (id: number) =>
      apiRequest<T>(`/${endpoint}/${id}/`),

    create: (data: Partial<T>) =>
      apiRequest<T>(`/${endpoint}/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: number, data: Partial<T>) =>
      apiRequest<T>(`/${endpoint}/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    partialUpdate: (id: number, data: Partial<T>) =>
      apiRequest<T>(`/${endpoint}/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      apiRequest<void>(`/${endpoint}/${id}/`, {
        method: "DELETE",
      }),
  }
}