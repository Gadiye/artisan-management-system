'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useArtisans, useArtisanPendingPayments } from '@/hooks/useResource';
import React, { useState } from 'react';

export default function PendingPaymentsPage() {
  const [selectedArtisan, setSelectedArtisan] = useState<number | null>(null);
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { data: pendingJobs, loading: pendingJobsLoading, error: pendingJobsError } = useArtisanPendingPayments(selectedArtisan);

  const loading = artisansLoading || pendingJobsLoading;
  const error = artisansError || pendingJobsError;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pending Payments</h1>
        <p className="text-muted-foreground mt-2">A list of all jobs with pending payments for a selected artisan.</p>
      </div>

      <div className="flex space-x-4 mb-6">
        <Select onValueChange={(value) => setSelectedArtisan(Number(value))}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select an Artisan" />
          </SelectTrigger>
          <SelectContent>
            {artisans?.map(artisan => (
              <SelectItem key={artisan.id} value={artisan.id.toString()}>{artisan.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error && typeof error === 'object' && 'message' in error 
              ? (error as Error).message 
              : "An unknown error occurred."}
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && selectedArtisan && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments for {artisans?.find(a => a.id === selectedArtisan)?.name}</CardTitle>
            <CardDescription>{pendingJobs ? pendingJobs.length : 0} jobs with pending payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Service Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Pending Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingJobs && pendingJobs.length > 0 ? (
                  pendingJobs.map((job) => (
                    <TableRow key={job.job_id}>
                      <TableCell>{job.job_id}</TableCell>
                      <TableCell><Badge variant="secondary">{job.service_category}</Badge></TableCell>
                      <TableCell><Badge>{job.status}</Badge></TableCell>
                      <TableCell>{new Date(job.created_date).toLocaleDateString()}</TableCell>
                      <TableCell>${Number(job.pending_payment).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No pending payments found for this artisan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
