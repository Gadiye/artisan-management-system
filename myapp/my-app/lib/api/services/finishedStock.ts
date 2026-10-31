// lib/api/services/finishedStock.ts
import { createCrudApi } from '../base'
import { apiRequest } from '../client'
import {
  AddFinishedStockPayload,
  FinishedStock,
  FinishedStockMovement,
  PaginatedResponse,
} from '@/types'

// Only read operations for finished stock; writes go through the add-stock action.
const finishedStockCrud = createCrudApi<FinishedStock>('inventory/finished-stock')

export const finishedStockApi = {
  list: finishedStockCrud.list,
  get: finishedStockCrud.get,

  addStock: (payload: AddFinishedStockPayload) =>
    apiRequest<{ message: string; results: FinishedStock[] }>(
      '/inventory/finished-stock/add-stock/',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  movements: (id: number) =>
    apiRequest<PaginatedResponse<FinishedStockMovement> | FinishedStockMovement[]>(
      `/inventory/finished-stock/${id}/movements/`
    ),
}
