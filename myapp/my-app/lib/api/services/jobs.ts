// lib/api/services/jobs.ts
import { apiRequest } from '../client';
import { createCrudApi } from '../base';
import { Job, JobItem, PaginatedResponse, JobListEntry } from '@/types';

const jobsCrud = createCrudApi<Job, PaginatedResponse<JobListEntry>>('jobs');

export const jobsApi = {
  ...jobsCrud,

  complete: (id: number, completionData: Record<string, unknown>) =>
    apiRequest<Job>(`/jobs/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify(completionData),
    }),

  createItem: (jobId: number, itemData: Partial<JobItem>) =>
    apiRequest<JobItem>(`/jobs/${jobId}/items/`, {
      method: "POST",
      body: JSON.stringify(itemData),
    }),
};