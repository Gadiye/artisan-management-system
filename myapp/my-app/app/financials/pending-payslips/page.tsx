"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useArtisans, useArtisanPendingPayments } from '@/hooks/useResource';
import React, { useState } from 'react';
import { ArrowLeft, Clock, Landmark, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PendingPaymentsPage() {
  const [selectedArtisan, setSelectedArtisan] = useState<number | null>(null);
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { data: pendingJobs, loading: pendingJobsLoading, error: pendingJobsError } = useArtisanPendingPayments(selectedArtisan);

  const loading = artisansLoading || pendingJobsLoading;
  const error = artisansError || pendingJobsError;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100 transition-colors -ml-3 mb-1">
            <Link href="/financials">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ledger
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Pending Artisan Dues</h1>
          <p className="text-sm font-semibold text-muted-foreground">Detailed statement of job items currently awaiting pay-period release</p>
        </div>
      </div>

      {/* Select Box container */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 p-4 border border-gray-200 rounded-2xl">
        <div className="w-full sm:max-w-xs">
          <Select onValueChange={(value) => setSelectedArtisan(Number(value))}>
            <SelectTrigger className="w-full bg-white border-gray-300 font-semibold text-sm h-11">
              <SelectValue placeholder="Select an Artisan..." />
            </SelectTrigger>
            <SelectContent>
              {artisans?.map(artisan => (
                <SelectItem key={artisan.id} value={artisan.id.toString()} className="text-sm font-semibold">
                  {artisan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <Card className="border-gray-200">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Error Loading Statements</AlertTitle>
          <AlertDescription>
            {error && typeof error === 'object' && 'message' in error
              ? (error as Error).message
              : "An unknown error occurred while loading pending jobs."}
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && selectedArtisan && (
        <Card className="border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="bg-gray-50/50 border-b pb-4">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
              Pending Payments for {artisans?.find(a => a.id === selectedArtisan)?.name}
            </CardTitle>
            <CardDescription className="text-xs font-semibold">{pendingJobs ? pendingJobs.length : 0} jobs detected in queue</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/30">
                <TableRow>
                  <TableHead className="font-bold text-gray-700 text-xs pl-6">Job ID</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Service Category</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Work Status</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Created Date</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Estimated Dues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingJobs && pendingJobs.length > 0 ? (
                  pendingJobs.map((job) => (
                    <TableRow key={job.job_id} className="hover:bg-slate-50/20 transition-colors">
                      <TableCell className="font-extrabold text-sm pl-6 py-4">#{job.job_id}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="font-bold text-[10px] uppercase">{job.service_category}</Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="font-bold text-[9px] uppercase px-2 py-0.5 border bg-blue-50 text-blue-700 border-blue-200">
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-600 py-4">
                        {new Date(job.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-emerald-600 pr-6 py-4">
                        Ksh {Number(job.pending_payment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-bold">
                      No pending jobs found for this artisan.
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
