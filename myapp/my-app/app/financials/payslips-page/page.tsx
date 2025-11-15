'use client'

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
import { CalendarIcon, Download, FileText, Clock, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { useArtisans, usePayslips, useArtisansWithPendingPayments, useArtisanPendingPayments } from '@/hooks/useResource';
import { api } from '@/lib/api';

const serviceCategories = ["CARVING", "CUTTING", "PAINTING", "SANDING", "FINISHING", "FINISHED"]

export default function PayslipsPage() {
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { data: payslips, loading: payslipsLoading, error: payslipsError, refetch: refetchPayslips } = usePayslips();
  const { data: artisansWithPendingPayments, loading: pendingPaymentsLoading, error: pendingPaymentsError } = useArtisansWithPendingPayments();

  const [selectedArtisan, setSelectedArtisan] = useState("")
  const [selectedService, setSelectedService] = useState("")
  const [periodStart, setPeriodStart] = useState<Date>()
  const [periodEnd, setPeriodEnd] = useState<Date>()
  const [generationType, setGenerationType] = useState<"individual" | "bulk">("individual")

  const [isPendingDetailsDialogOpen, setIsPendingDetailsDialogOpen] = useState(false);
  const [selectedArtisanForDetails, setSelectedArtisanForDetails] = useState<number | null>(null);

  const safeArtisans = artisans || [];
  const safePayslips = payslips || [];
  const safeArtisansWithPendingPayments = artisansWithPendingPayments || [];

  const totalPayslips = safePayslips.length
  const totalPayments = safePayslips.reduce((sum, p) => sum + (typeof p.total_payment === 'number' ? p.total_payment : parseFloat(p.total_payment) || 0), 0)
  const pendingAmount = safeArtisansWithPendingPayments.reduce((sum, artisan) => sum + (typeof artisan.pending_payment_total === 'number' ? artisan.pending_payment_total : parseFloat(artisan.pending_payment_total) || 0), 0);

  const handleGeneratePayslip = async () => {
    try {
      if (generationType === "individual" && selectedArtisan && periodStart && periodEnd) {
        await api.financials.payslips.generate({
          artisan_id: parseInt(selectedArtisan),
          period_start: format(periodStart, "yyyy-MM-dd"),
          period_end: format(periodEnd, "yyyy-MM-dd"),
        });
        alert("Individual payslip generated successfully!");
      } else if (generationType === "bulk" && selectedService && periodStart && periodEnd) {
        await api.financials.payslips.generate({
          service_category: selectedService,
          period_start: format(periodStart, "yyyy-MM-dd"),
          period_end: format(periodEnd, "yyyy-MM-dd"),
        });
        alert("Bulk payslips generated successfully!");
      }
      refetchPayslips();
      // Reset form
      setSelectedArtisan("");
      setSelectedService("");
      setPeriodStart(undefined);
      setPeriodEnd(undefined);
    } catch (err: unknown) {
      alert(`Failed to generate payslip: ${(err as Error).message}`);
    }
  }

  const handleDownloadPayslip = async (id: number, fullPath: string) => {
    try {
      const blob = await api.financials.payslips.downloadSpreadsheet(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const filename = fullPath.split('/').pop() || `payslip_${id}.xlsx`; // Extract filename
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up the object URL
    } catch (err: unknown) {
      alert(`Failed to download payslip: ${(err as Error).message}`);
    }
  }

  if (artisansLoading || payslipsLoading || pendingPaymentsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-8">
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

  if (artisansError || payslipsError || pendingPaymentsError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{artisansError instanceof Error ? artisansError.message : payslipsError instanceof Error ? payslipsError.message : "An unknown error occurred."}</AlertDescription>
        </Alert>
        <Button onClick={() => { refetchPayslips(); /* refetchArtisans if implemented */ }} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Payslip Management</h1>
        <p className="text-muted-foreground mt-2">Generate and manage artisan payslips</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayslips}</div>
            <p className="text-xs text-muted-foreground">Generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payslip generation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Artisans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeArtisans.length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate" className="mb-8">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="generate">
            <Plus className="h-4 w-4 mr-2" />
            Generate Payslips
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Payslip History
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending Payments
          </TabsTrigger>
        </TabsList>

        {/* Generate Payslips Tab */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Payslips</CardTitle>
              <CardDescription>Create individual or bulk payslips for artisans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Generation Type Selection */}
              <div>
                <Label className="text-base font-medium">Generation Type</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="individual"
                      name="generationType"
                      checked={generationType === "individual"}
                      onChange={() => setGenerationType("individual")}
                    />
                    <Label htmlFor="individual">Individual Artisan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="bulk"
                      name="generationType"
                      checked={generationType === "bulk"}
                      onChange={() => setGenerationType("bulk")}
                    />
                    <Label htmlFor="bulk">Bulk by Service Category</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selection */}
                <div className="space-y-4">
                  {generationType === "individual" ? (
                    <div>
                      <Label htmlFor="artisan">Select Artisan</Label>
                      <Select value={selectedArtisan} onValueChange={setSelectedArtisan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an artisan" />
                        </SelectTrigger>
                        <SelectContent>
                          {safeArtisans.map((artisan) => (
                            <SelectItem key={artisan.id} value={artisan.id.toString()}>
                              {artisan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="service">Select Service Category</Label>
                      <Select value={selectedService} onValueChange={setSelectedService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a service category" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCategories.map((service) => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-4">
                  <div>
                    <Label>Period Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !periodStart && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {periodStart ? format(periodStart, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Period End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !periodEnd && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {periodEnd ? format(periodEnd, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleGeneratePayslip}
                  disabled={
                    !periodStart ||
                    !periodEnd ||
                    (generationType === "individual" && !selectedArtisan) ||
                    (generationType === "bulk" && !selectedService)
                  }
                  className="w-full md:w-auto"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate {generationType === "bulk" ? "Bulk " : ""}Payslip{generationType === "bulk" ? "s" : ""}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payslip History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payslip History</CardTitle>
              <CardDescription>All generated payslips</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artisan</TableHead>
                    <TableHead>Service Category</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Gross Payment</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Payment</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safePayslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">{payslip.artisan.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payslip.service_category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{payslip.period_start}</div>
                          <div className="text-muted-foreground">to {payslip.period_end}</div>
                        </div>
                      </TableCell>
                     <TableCell className="font-medium">
                        Ksh{(parseFloat(payslip.total_payment || '0') + parseFloat(payslip.total_advances_deducted || '0')).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        -Ksh{parseFloat(payslip.total_advances_deducted || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium">
                        Ksh{parseFloat(payslip.total_payment || '0').toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(payslip.generated_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPayslip(payslip.id, payslip.spreadsheet_file)} disabled={!payslip.spreadsheet_file}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Payments Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments Summary</CardTitle>
              <CardDescription>Total pending payments for each artisan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artisan</TableHead>
                    <TableHead>Total Pending Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeArtisansWithPendingPayments && safeArtisansWithPendingPayments.length > 0 ? (
                    safeArtisansWithPendingPayments.map((artisan) => (
                      <TableRow
                        key={artisan.id}
                        onClick={() => {
                          setSelectedArtisanForDetails(artisan.id);
                          setIsPendingDetailsDialogOpen(true);
                        }}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <Badge variant="outline">{artisan.name}</Badge>
                        </TableCell>
                        <TableCell>${Number(artisan.pending_payment_total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No pending payments found.
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
  artisans: any[]; // Artisan[]
}

function PendingPaymentDetailsDialog({ isOpen, onClose, artisanId, artisans }: PendingPaymentDetailsDialogProps) {
  const { data: pendingJobs, loading, error } = useArtisanPendingPayments(artisanId);

  const selectedArtisan = artisans.find(a => a.id === artisanId);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pending Payment Details for {selectedArtisan?.name}</DialogTitle>
          <DialogDescription>
            Job items awaiting payslip generation for this artisan.
          </DialogDescription>
        </DialogHeader>
        {loading && <p>Loading pending job items...</p>}
        {error && <p className="text-red-500">Error loading details: {error.message}</p>}
        {pendingJobs && pendingJobs.length > 0 ? (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Accepted Qty</TableHead>
                  <TableHead>Final Payment</TableHead>
                  <TableHead>Date Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingJobs.map((job) => (
                  job.items && job.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{job.job_id}</TableCell>
                      <TableCell>{item.product.product_type} ({item.product.animal_type})</TableCell>
                      <TableCell>{job.service_category}</TableCell>
                      <TableCell>{item.quantity_accepted}</TableCell>
                      <TableCell>Ksh{parseFloat(item.final_payment as any).toFixed(2)}</TableCell>
                      <TableCell>{new Date(job.created_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          !loading && !error && <p>No pending job items found for this artisan.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
