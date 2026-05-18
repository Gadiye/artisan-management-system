"use client";

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, CheckCircle, Briefcase, TrendingUp, DollarSign, Clock } from "lucide-react"
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
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center border-b pb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Job Management
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Track and manage artisan work assignments and production progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/create">
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </Link>
          <Link href="/jobs/complete">
            <Button variant="outline" className="shadow-sm bg-white">
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Job Statistics - Glassmorphic Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Clock className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{activeJobs}</div>
            <p className="text-xs text-blue-800/80 font-medium mt-1">Currently in progress with artisans</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/10">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {totalActiveJobValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-emerald-800/80 font-medium mt-1">Estimated payout for active jobs</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/10">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <TrendingUp className="h-16 w-16 text-purple-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              Completed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-600 tracking-tight">{completedJobs}</div>
            <p className="text-xs text-purple-800/80 font-medium mt-1">Total jobs finished and verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-bold text-gray-900">All Jobs</CardTitle>
          <CardDescription className="text-xs">Complete list of production jobs and their current status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/70">
              <TableRow>
                <TableHead className="font-bold text-gray-700 text-xs">Job ID</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Artisans</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Date Created</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Service</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Created By</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Total Cost</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeJobs.length === 0 ? (
                <TableRow key="no-jobs-row">
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-medium">
                    No jobs found. Create your first job to get started.
                  </TableCell>
                </TableRow>
              ) : (
                safeJobs.map((job: JobListEntry) => (
                  <TableRow key={job.job_id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-blue-600">#{job.job_id}</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {job.artisans_involved && job.artisans_involved.length > 0
                        ? job.artisans_involved.join(', ')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">{new Date(job.created_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-none font-semibold text-[10px] px-2 py-0.5">
                        {job.service_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">{job.created_by}</TableCell>
                    <TableCell className="font-bold text-gray-900 text-sm">
                      Ksh {Number(job.total_cost).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={job.status === "COMPLETED" ? "default" : "secondary"}
                        className={job.status === "COMPLETED" 
                          ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-bold text-[10px]" 
                          : "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 font-bold text-[10px]"
                        }
                      >
                        {job.status?.replace(/_/g, " ") || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/jobs/${job.job_id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4 text-gray-500" />
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