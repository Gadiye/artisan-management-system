"use client";

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, CheckCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useJobs } from '@/hooks/useResource';
import { JobListEntry } from '@/types';



export default function JobsPage() {
  const { data: jobs, loading, error, refetch } = useJobs();

  // Since useJobs now returns JobListEntry[] directly (normalized in the hook)
  const safeJobs: JobListEntry[] = Array.isArray(jobs) ? jobs : [];

  const activeJobs = safeJobs.filter((job: JobListEntry) => job.status === "IN_PROGRESS").length;
  const totalActiveJobValue = safeJobs
    .filter((job: JobListEntry) => job.status === "IN_PROGRESS")
    .reduce((sum: number, job: JobListEntry) => {
      const cost = parseFloat(job.total_cost);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

  // Count completed jobs
  const completedJobs = safeJobs.filter((job: JobListEntry) => job.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
          {[...Array(3)].map((_, i) => (
            <Card key={`skeleton-card-${i}`}>
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
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Job Management</h1>
            <p className="text-muted-foreground mt-2">Track and manage artisan work assignments</p>
          </div>
          <div className="flex gap-2">
            <Link href="/jobs/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </Link>
            <Link href="/jobs/complete">
              <Button variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Job
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Job Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Ksh{totalActiveJobValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Active jobs value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">Jobs finished</p>
          </CardContent>
        </Card>
      </div>
      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>Complete list of production jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {/* Reordered columns for better visual flow */}
                <TableHead>Job ID</TableHead>
                <TableHead>Artisans</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeJobs.length === 0 ? (
                <TableRow key="no-jobs-row">
                  {/* Adjusted colSpan to match the new number of columns */}
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                safeJobs.map((job: JobListEntry) => (
                  <TableRow key={job.job_id}>
                    {/* Matched cell order to the new header order */}
                    <TableCell className="font-medium">#{job.job_id}</TableCell>
                    <TableCell>
                      {job.artisans_involved && job.artisans_involved.length > 0
                        ? job.artisans_involved.join(', ')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{new Date(job.created_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{job.service_category}</Badge>
                    </TableCell>
                    <TableCell>{job.created_by}</TableCell>
                    <TableCell className="font-medium">Ksh{Number(job.total_cost).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === "COMPLETED" ? "default" : "secondary"}>
                        {/* Cleanly display status by replacing underscores with spaces */}
                        {job.status?.replace(/_/g, " ") || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/jobs/${job.job_id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}