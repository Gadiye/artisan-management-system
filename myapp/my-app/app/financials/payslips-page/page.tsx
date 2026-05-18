"use client";

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, FileText, Clock, Plus, Landmark, DollarSign, Wallet, Users, ArrowLeft, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { useArtisans, usePayslips, useArtisansWithPendingPayments, useArtisanPendingPayments } from '@/hooks/useResource';
import { api } from '@/lib/api';
import { Artisan } from "@/types";
import { SERVICE_CATEGORIES } from '@/lib/constants';
import Link from "next/link"

export default function PayslipsPage() {
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { data: payslips, loading: payslipsLoading, error: payslipsError, refetch: refetchPayslips } = usePayslips();
  const { data: artisansWithPendingPayments, loading: pendingPaymentsLoading, error: pendingPaymentsError } = useArtisansWithPendingPayments();

  const [selectedArtisan, setSelectedArtisan] = useState("")
  const [selectedService, setSelectedService] = useState("")
  const [periodStart, setPeriodStart] = useState<Date>()
  const [periodEnd, setPeriodEnd] = useState<Date>()
  const [generationType, setGenerationType] = useState<"individual" | "bulk">("individual")
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isPendingDetailsDialogOpen, setIsPendingDetailsDialogOpen] = useState(false);
  const [selectedArtisanForDetails, setSelectedArtisanForDetails] = useState<number | null>(null);

  const safeArtisans = artisans || [];
  const safePayslips = payslips || [];
  const safeArtisansWithPendingPayments = artisansWithPendingPayments || [];

  const totalPayslips = safePayslips.length
  const totalPayments = safePayslips.reduce((sum, p) => sum + Number(p.total_payment || 0), 0)
  const pendingAmount = safeArtisansWithPendingPayments.reduce((sum, artisan) => sum + Number(artisan.pending_payment_total || 0), 0);

  const handleGeneratePayslip = async () => {
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (generationType === "individual" && selectedArtisan && periodStart && periodEnd) {
        await api.financials.payslips.generate({
          artisan_id: parseInt(selectedArtisan),
          period_start: format(periodStart, "yyyy-MM-dd"),
          period_end: format(periodEnd, "yyyy-MM-dd"),
        });
        setActionSuccess("Individual payslip compiled and generated successfully!");
      } else if (generationType === "bulk" && selectedService && periodStart && periodEnd) {
        await api.financials.payslips.generate({
          service_category: selectedService,
          period_start: format(periodStart, "yyyy-MM-dd"),
          period_end: format(periodEnd, "yyyy-MM-dd"),
        });
        setActionSuccess("Bulk service stage payslips compiled successfully!");
      }
      refetchPayslips();
      setSelectedArtisan("");
      setSelectedService("");
      setPeriodStart(undefined);
      setPeriodEnd(undefined);
    } catch (err: unknown) {
      setActionError((err as Error).message || "Failed to generate payslip record.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleDownloadPayslip = async (id: number, fullPath: string) => {
    try {
      const blob = await api.financials.payslips.downloadSpreadsheet(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const filename = fullPath.split('/').pop() || `payslip_${id}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(`Failed to download payslip spreadsheet: ${(err as Error).message}`);
    }
  }

  if (artisansLoading || payslipsLoading || pendingPaymentsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-8 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (artisansError || payslipsError || pendingPaymentsError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Ledger Error</AlertTitle>
          <AlertDescription>
            {artisansError instanceof Error ? artisansError.message : payslipsError instanceof Error ? payslipsError.message : "Failed to load payslips system state."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100 transition-colors -ml-3 mb-1">
            <Link href="/financials">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ledger
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Payslip Portal</h1>
          <p className="text-sm font-semibold text-muted-foreground">Compile pay-period payroll sheets and manage historic disbursement logs</p>
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Processing Failure</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 animate-in fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <FileText className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Payslips Released
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tracking-tight">{totalPayslips} sheets</div>
            <p className="text-[10px] text-blue-800/80 font-bold mt-1">Historically compiled registers</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Total Disbursements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-800/80 font-bold mt-1">Paid net payables</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Clock className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              Ksh {pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-amber-800/80 font-bold mt-1">Awaiting payslip execution</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Users className="h-16 w-16 text-indigo-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              Roster Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">{safeArtisans.length} active</div>
            <p className="text-[10px] text-indigo-800/80 font-bold mt-1">Registered craftspeople</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border rounded-xl grid grid-cols-3 max-w-xl">
          <TabsTrigger value="generate" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
            <Plus className="h-4 w-4 mr-1.5" />
            Compile
          </TabsTrigger>
          <TabsTrigger value="history" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
            <FileText className="h-4 w-4 mr-1.5" />
            History Registry
          </TabsTrigger>
          <TabsTrigger value="pending" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
            <Clock className="h-4 w-4 mr-1.5" />
            Pending Balance
          </TabsTrigger>
        </TabsList>

        {/* Generate Payslips Tab */}
        <TabsContent value="generate">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900">Compile New Payslips</CardTitle>
              <CardDescription className="text-xs font-semibold">Compile payroll sheets by individual artisan or bulk categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Mode Select */}
              <div className="p-3 bg-slate-50 border rounded-2xl w-fit flex items-center gap-2">
                <Button
                  variant={generationType === "individual" ? "default" : "ghost"}
                  onClick={() => setGenerationType("individual")}
                  className="h-9 px-4 text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Individual Artisan
                </Button>
                <Button
                  variant={generationType === "bulk" ? "default" : "ghost"}
                  onClick={() => setGenerationType("bulk")}
                  className="h-9 px-4 text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Bulk Category
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Target Inputs */}
                <div className="space-y-4">
                  {generationType === "individual" ? (
                    <div className="space-y-2">
                      <Label htmlFor="artisan-select" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Target Artisan *</Label>
                      <Select value={selectedArtisan} onValueChange={setSelectedArtisan}>
                        <SelectTrigger id="artisan-select" className="bg-white border-gray-300 font-medium text-sm h-11">
                          <SelectValue placeholder="Choose an artisan..." />
                        </SelectTrigger>
                        <SelectContent>
                          {safeArtisans.map((artisan) => (
                            <SelectItem key={artisan.id} value={artisan.id.toString()} className="text-sm font-semibold">
                              {artisan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="service-select" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Service Stage Category *</Label>
                      <Select value={selectedService} onValueChange={setSelectedService}>
                        <SelectTrigger id="service-select" className="bg-white border-gray-300 font-medium text-sm h-11">
                          <SelectValue placeholder="Choose service category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((service) => (
                            <SelectItem key={service} value={service} className="text-sm font-semibold">
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Period Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Period Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-semibold text-sm border-gray-300 bg-white",
                            !periodStart && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {periodStart ? format(periodStart, "PPP") : <span>Pick date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Period End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-semibold text-sm border-gray-300 bg-white",
                            !periodEnd && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {periodEnd ? format(periodEnd, "PPP") : <span>Pick date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t mt-4">
                <Button
                  onClick={handleGeneratePayslip}
                  disabled={
                    !periodStart ||
                    !periodEnd ||
                    (generationType === "individual" && !selectedArtisan) ||
                    (generationType === "bulk" && !selectedService) ||
                    submitting
                  }
                  className="h-11 font-bold text-xs uppercase px-5 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4 stroke-[2.5]" />
                  )}
                  {submitting ? "Compiling Sheets..." : `Compile ${generationType === "bulk" ? "Bulk " : ""}Payslip${generationType === "bulk" ? "s" : ""}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payslip History Tab */}
        <TabsContent value="history">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900">Payslip History</CardTitle>
              <CardDescription className="text-xs font-semibold">Registry of completed payroll sheets</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/30">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs pl-6">Artisan Profile</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Stage Group</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Interval period</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Gross Piece-Rate</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Deductions</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Net payment</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Generated Date</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-center pr-6">Sheet Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safePayslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-bold">
                        No payslips have been compiled in historic register.
                      </TableCell>
                    </TableRow>
                  ) : (
                    safePayslips.map((payslip) => (
                      <TableRow key={payslip.id} className="hover:bg-slate-50/20 transition-colors group">
                        <TableCell className="pl-6 py-4">
                          <div className="font-extrabold text-sm text-gray-900">{payslip.artisan.name}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="font-bold text-[10px] uppercase">{payslip.service_category}</Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-xs font-semibold text-gray-700">
                            {payslip.period_start} <span className="text-muted-foreground mx-1">➔</span> {payslip.period_end}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-gray-600 py-4">
                          Ksh {Number(Number(payslip.total_payment || 0) + Number(payslip.total_advances_deducted || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-xs text-rose-600 py-4">
                          {Number(payslip.total_advances_deducted || 0) > 0 
                            ? `-Ksh ${Number(payslip.total_advances_deducted || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                            : "—"
                          }
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-sm text-gray-950 py-4">
                          Ksh {Number(payslip.total_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-gray-600 py-4">
                          {new Date(payslip.generated_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center pr-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPayslip(payslip.id, payslip.spreadsheet_file || '')}
                            disabled={!payslip.spreadsheet_file}
                            className="h-8 w-8 p-0 rounded-full border border-gray-150 hover:bg-gray-100 text-gray-700 hover:text-indigo-600 transition-colors flex items-center justify-center mx-auto"
                            title="Download Spreadsheet"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Payments Tab */}
        <TabsContent value="pending">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900">Pending Payments Summary</CardTitle>
              <CardDescription className="text-xs font-semibold">Total outstanding unreleased payments awaiting payslip compilation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/30">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs pl-6">Artisan Profile</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Total Pending Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeArtisansWithPendingPayments.length > 0 ? (
                    safeArtisansWithPendingPayments.map((artisan) => (
                      <TableRow
                        key={artisan.id}
                        onClick={() => {
                          setSelectedArtisanForDetails(artisan.id);
                          setIsPendingDetailsDialogOpen(true);
                        }}
                        className="cursor-pointer hover:bg-slate-50/35 transition-colors group"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-extrabold text-xs text-gray-700">
                              {artisan.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                            </div>
                            <span className="font-extrabold text-sm text-gray-950 group-hover:text-blue-600 transition-colors">
                              {artisan.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-emerald-600 pr-6 py-4">
                          Ksh {Number(artisan.pending_payment_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-12 text-muted-foreground font-bold">
                        No outstanding pending payments awaiting compiling.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pending Payment Details Dialog */}
      <PendingPaymentDetailsDialog
        isOpen={isPendingDetailsDialogOpen}
        onClose={() => setIsPendingDetailsDialogOpen(false)}
        artisanId={selectedArtisanForDetails}
        artisans={safeArtisans}
      />
    </div>
  )
}

interface PendingPaymentDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artisanId: number | null;
  artisans: Artisan[];
}

function PendingPaymentDetailsDialog({ isOpen, onClose, artisanId, artisans }: PendingPaymentDetailsDialogProps) {
  const { data: pendingJobs, loading, error } = useArtisanPendingPayments(artisanId);
  const selectedArtisan = artisans.find(a => a.id === artisanId);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl border-gray-200 rounded-2xl shadow-xl p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-lg font-bold text-gray-900">
            Pending Payment Details for {selectedArtisan?.name}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
            Job items awaiting compilation into a payslip sheet
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Loading details matrix...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50 text-red-950 text-xs my-4">
            <AlertDescription>Error loading details: {error.message}</AlertDescription>
          </Alert>
        )}

        {pendingJobs && pendingJobs.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto mt-4 border border-gray-250 rounded-xl">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-bold text-gray-700 text-xs pl-6">Job ID</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Product Details</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Service Category</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-right">Accepted Qty</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Piece-Rate Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingJobs.flatMap((job) => 
                  (job.items || []).map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/20 transition-colors">
                      <TableCell className="font-extrabold text-sm pl-6 py-3">#{job.job_id}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-gray-900">{item.product.product_type.replace(/_/g, " ")}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">• {item.product.animal_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="font-bold text-[9px] uppercase">{job.service_category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs text-gray-800 py-3">{item.quantity_accepted} pcs</TableCell>
                      <TableCell className="text-right font-black text-sm text-emerald-600 pr-6 py-3">
                        Ksh {Number(item.final_payment).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          !loading && !error && (
            <p className="text-center py-12 text-sm font-semibold text-muted-foreground">No pending job items found for this artisan.</p>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
