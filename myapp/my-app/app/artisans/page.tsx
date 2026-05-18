"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Edit, Phone, Calendar, DollarSign, Award, Star, Clock, Loader2, Sparkles, UserCheck } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useArtisans } from '@/hooks/useResource';
import { api, Artisan } from '@/lib/api';

type NewArtisan = Omit<Artisan, 'id'>;

export default function ArtisansPage() {
  const { data: artisans, loading, error, refetch } = useArtisans();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newArtisan, setNewArtisan] = useState<Partial<NewArtisan>>({
    name: "",
    phone: "",
    specialties: [],
    is_active: true,
    created_date: new Date().toISOString(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const safeArtisans = Array.isArray(artisans) ? artisans : [];

  const activeArtisans = safeArtisans.filter((a) => a.is_active).length;
  const totalEarnings = safeArtisans.reduce((sum, a) => sum + Number(a.total_earnings || 0), 0);
  const totalPendingPayments = safeArtisans.reduce((sum, a) => sum + Number(a.pending_payment || 0), 0);
  const averageRating = safeArtisans.length ?
    safeArtisans.reduce((sum, a) => sum + Number(a.average_rating || 0), 0) / safeArtisans.length : 0;

  async function handleAddArtisan() {
    setSubmitting(true);
    setAddError(null);
    try {
      await api.artisans.create(newArtisan as NewArtisan);
      setShowAddDialog(false);
      setNewArtisan({ name: "", phone: "", specialties: [], is_active: true, created_date: new Date().toISOString() });
      refetch();
    } catch (err) {
      console.error("Failed to create artisan:", err);
      setAddError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-11 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Error Loading Artisans</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Failed to load artisans records."}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Artisan Directory</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Manage and track performance metrics of craftspeople</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="h-11 font-bold text-xs uppercase px-5 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus className="mr-2 h-4 w-4 stroke-[3]" />
              Add Artisan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-gray-200 rounded-2xl shadow-xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                Add New Artisan
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
                Enter the profile details for the new artisan
              </DialogDescription>
            </DialogHeader>
            {addError && (
              <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50 text-red-950 text-xs">
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Full Name *</Label>
                <Input
                  id="name"
                  value={newArtisan.name}
                  onChange={(e) => setNewArtisan({ ...newArtisan, name: e.target.value })}
                  placeholder="e.g. John Mwangi"
                  className="h-11 border-gray-300 font-medium text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Phone Contact</Label>
                <Input
                  id="phone"
                  value={newArtisan.phone}
                  onChange={(e) => setNewArtisan({ ...newArtisan, phone: e.target.value })}
                  placeholder="e.g. +254 712 345 678"
                  className="h-11 border-gray-300 font-medium text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t mt-6 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="h-11 px-4 text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddArtisan} 
                  disabled={!newArtisan.name || submitting} 
                  className="h-11 px-5 text-xs font-bold uppercase"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register Artisan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <UserCheck className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Active Artisans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tracking-tight">{activeArtisans} / {safeArtisans.length}</div>
            <p className="text-[10px] text-blue-800/80 font-bold mt-1">Currently taking jobs</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Total Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-800/80 font-bold mt-1">Cumulative payroll values</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Clock className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              Pending Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              Ksh {totalPendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-amber-800/80 font-bold mt-1">Awaiting payslip release</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Star className="h-16 w-16 text-purple-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              Quality Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-purple-600 tracking-tight flex items-center gap-1">
              {averageRating.toFixed(1)} <Star className="h-4.5 w-4.5 fill-purple-600 text-purple-600 stroke-2" />
            </div>
            <p className="text-[10px] text-purple-800/80 font-bold mt-1">Average catalog score</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">All Artisans</CardTitle>
          <CardDescription className="text-xs font-semibold">Active roster of skilled production specialists</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/30">
              <TableRow>
                <TableHead className="font-bold text-gray-700 text-xs pl-6">Artisan Profile</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Contact</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Rating</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Cumulative Payments</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Pending Dues</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs pl-6">Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-center pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeArtisans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-medium">
                    No artisans found in catalog records.
                  </TableCell>
                </TableRow>
              ) : (
                safeArtisans.map((artisan: Artisan) => (
                  <TableRow key={artisan.id} className="hover:bg-gray-50/30 transition-colors group">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-sm">
                          {artisan.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-gray-900">{artisan.name}</div>
                          <div className="text-[11px] text-muted-foreground font-bold flex items-center mt-0.5">
                            <Calendar className="h-3 w-3 mr-1 stroke-[2.5]" />
                            Joined {new Date(artisan.created_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center text-xs font-bold text-gray-700">
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground stroke-[2.5]" />
                        {artisan.phone || 'No Phone Registered'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center text-xs font-extrabold text-amber-600 gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {Number(artisan.average_rating || 0).toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-xs text-gray-900 py-4">
                      Ksh {Number(artisan.total_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-xs text-amber-600 py-4">
                      Ksh {Number(artisan.pending_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="pl-6 py-4">
                      <Badge variant="outline" className={`font-bold text-[9px] uppercase border px-2 py-0.5 w-fit ${
                        artisan.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {artisan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center pr-6 py-4">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Link href={`/artisans/${artisan.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full border border-gray-100 hover:bg-gray-100 hover:text-indigo-600 transition-all flex items-center justify-center"
                            title="View Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/artisans/${artisan.id}/edit`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full border border-gray-100 hover:bg-gray-100 hover:text-blue-600 transition-all flex items-center justify-center"
                            title="Edit Artisan"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
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