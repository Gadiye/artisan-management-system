// hooks/useCreateJob.ts
"use client"

import { useState, useCallback } from 'react'
import { api } from '../lib/api'
import { CreateJobPayload } from '../lib/api/types'
import { Job } from '@/types'

export function useCreateJob() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobResponse, setJobResponse] = useState<Job | null>(null)

  const createJob = useCallback(async (data: CreateJobPayload) => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.jobs.create(data)
      setJobResponse(result as unknown as Job)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createJob, loading, error, jobResponse }
}