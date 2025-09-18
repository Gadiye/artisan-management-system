"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CheckCircle, Package, Clock, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useJob } from '@/hooks/useResource';
import React, { use } from 'react';
import { RecordDeliveryDialog } from "@/components/record-delivery-dialog";

function getStatusIcon(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4" />
    case "PARTIALLY_RECEIVED":
      return <Package className="h-4 w-4" />
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "secondary"
    case "PARTIALLY_RECEIVED":
      return "default"
    case "COMPLETED":
      return "default"
    default:
      return "secondary"
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const jobId = parseInt(id);
  
  const { data: job, loading, error, refetch } = useJob(jobId);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-8">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error && typeof error === 'object' && 'message' in error 
              ? (error as Error).message 
              : "An unknown error occurred."}
          </AlertDescription>
        </Alert>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Job Not Found</AlertTitle>
          <AlertDescription>The job with ID {jobId} could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Job Details: #{job.job_id}</h1>
        <p className="text-muted-foreground mt-2">Overview and progress of this production job</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusColor(job.status)} className="text-lg px-3 py-1">
              {getStatusIcon(job.status)} {job.status ? job.status.replace(/_/g, " ") : ""}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Artisan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {job.items.length > 0 ? `${job.items.length}` : 'Not assigned'}
            </div>
            <p className="text-xs text-muted-foreground">Assigned artisan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{job.total_cost ? Number(job.total_cost).toFixed(2) : '0.00'}</div>
            <p className="text-xs text-muted-foreground">Estimated total payment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Job Items</CardTitle>
          <CardDescription>Products included in this job</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artisan</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {typeof item.artisan === 'object' 
                        ? item.artisan?.name || 'Unknown'
                        : item.artisan || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.product && typeof item.product === 'object' ? (
                      <div className="text-sm">
                        <div className="font-medium">{item.product.product_type}</div>
                        <div className="text-xs text-muted-foreground">{item.product.animal_type}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Product {item.product}</span>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity_ordered}</TableCell>
                  <TableCell>{item.quantity_received}</TableCell>
                  <TableCell>{item.quantity_accepted}</TableCell>
                  <TableCell>{item.quantity_ordered - item.quantity_received}</TableCell>
                  <TableCell>Ksh{Number(item.original_amount).toFixed(2)}</TableCell>
                  <TableCell>Ksh{Number(item.final_payment).toFixed(2)}</TableCell>
                  <TableCell>
                    <RecordDeliveryDialog jobItem={item} refetchJob={refetch} disabled={item.quantity_ordered <= item.quantity_received} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Notes</CardTitle>
          <CardDescription>Additional notes for this job</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {job.notes || "No notes for this job."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
