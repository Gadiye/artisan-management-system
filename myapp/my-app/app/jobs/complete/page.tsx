"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Package, Plus, CheckCircle, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { useJobs, useJob } from '@/hooks/useResource';
import { api, Job, JobItem, JobDelivery } from '@/lib/api';

const rejectionReasons = [
  { value: "QUALITY", label: "Quality Issues" },
  { value: "DAMAGE", label: "Damaged Item" },
  { value: "OTHER", label: "Other" },
]

interface Delivery {
  quantityReceived: number
  quantityAccepted: number
  rejectionReason?: string
  notes?: string
}

// Extended JobItem interface to include deliveries
interface JobItemWithDeliveries extends JobItem {
  deliveries?: JobDelivery[];
  service_rate_per_unit?: number; // Explicitly add this property
}

// Extended Job interface to include items with deliveries
interface JobWithDeliveries extends Job {
  items: JobItemWithDeliveries[]
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error || "An unknown error occurred.");
}

export default function CompleteJobPage() {
  useRouter();
  const { data: jobs, loading, error, refetch } = useJobs();
  const [detailedJob, setDetailedJob] = useState<JobWithDeliveries | null>(null);

  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [isSelectionExpanded, setIsSelectionExpanded] = useState(true)
  const [newDelivery, setNewDelivery] = useState<Delivery>({
    quantityReceived: 0,
    quantityAccepted: 0,
    rejectionReason: "",
    notes: "",
  })

  const { data: fetchedJob } = useJob(selectedJobId ? parseInt(selectedJobId) : 0);

  useEffect(() => {
    if (fetchedJob) {
      setDetailedJob(fetchedJob as unknown as JobWithDeliveries);
    }
  }, [fetchedJob]);

  const safeJobs = jobs || [];

  const selectedJob = detailedJob;
  const selectedItem = selectedJob?.items?.find((item) => item.id === selectedItemId) ?? null;

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId)
    setSelectedItemId(null)
    resetDeliveryForm()
    setIsSelectionExpanded(false)
  }

  const resetDeliveryForm = () => {
    setNewDelivery({
      quantityReceived: 0,
      quantityAccepted: 0,
      rejectionReason: "",
      notes: "",
    })
  }

  const handleAddDelivery = async () => {
    if (selectedJob && selectedItem && newDelivery.quantityReceived > 0) {
      const remainingQuantity = selectedItem.quantity_ordered - selectedItem.quantity_received;

      if (newDelivery.quantityReceived > remainingQuantity) {
        alert(`Cannot receive ${newDelivery.quantityReceived} pieces. Only ${remainingQuantity} pieces remain.`);
        return;
      }

      try {
        const updatedItem = await api.jobs.createDelivery(selectedJob.job_id, selectedItem.id, {
          quantity_received: newDelivery.quantityReceived,
          quantity_accepted: newDelivery.quantityAccepted,
          rejection_reason: newDelivery.rejectionReason,
          notes: newDelivery.notes,
        });

        // Update the selected item with the new data
        if (selectedJob) {
          const updatedItems = selectedJob.items.map(item =>
            item.id === selectedItem.id ? updatedItem : item
          );
          setDetailedJob({ ...selectedJob, items: updatedItems });
        }

        refetch(); // Refetch jobs to update UI
        resetDeliveryForm();
        alert("Delivery recorded successfully!");
      } catch (err) {
        alert(`Failed to record delivery: ${(err as Error).message}`);
      }
    }
  }

  const getRemainingQuantity = (item: JobItemWithDeliveries) => {
    return item.quantity_ordered - item.quantity_received;
  }

  const getCompletionPercentage = (item: JobItemWithDeliveries) => {
    return (item.quantity_received / item.quantity_ordered) * 100;
  }

  const getJobStatus = (job: JobWithDeliveries) => {
    const totalOrdered = (job.items ?? []).reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = (job.items ?? []).reduce((sum, item) => sum + item.quantity_received, 0);

    if (totalReceived === 0) return "IN_PROGRESS";
    if (totalReceived < totalOrdered) return "PARTIALLY_RECEIVED";
    return "COMPLETED";
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "PARTIALLY_RECEIVED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getProductDisplay = (product: JobItem['product']) => {
    if (typeof product === 'object' && product !== null) {
      return `${product.product_type} - ${product.animal_type}`;
    }
    return "Product";
  }

  const getArtisanDisplay = (artisan: JobItem['artisan']) => {
    if (typeof artisan === 'object' && artisan !== null) {
      return artisan.name;
    }
    return `Artisan ${artisan}`;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="border-b pb-6">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
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
            <CheckCircle className="h-8 w-8 text-blue-600" />
            Job Delivery Management
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Record deliveries and track job completion progress across artisan assignments
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-150 px-3 py-1.5 rounded-full shadow-sm">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span>Real-time Fulfillment Tracking</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Job Selection Grid */}
          {selectedJob && !isSelectionExpanded ? (
            <Card className="border border-blue-150 bg-blue-50/20 shadow-sm overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded text-sm font-mono shadow-sm">
                    JOB #{selectedJob.job_id}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      {selectedJob.service_category}
                      <Badge className={`${getStatusColor(getJobStatus(selectedJob))} text-[10px] font-bold uppercase tracking-wider py-0.5 px-1.5 border`}>
                        {getJobStatus(selectedJob).replace("_", " ")}
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      Artisans: {selectedJob.artisans_involved?.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="space-y-1 w-32">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Progress</span>
                      <span>
                        {((selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_received, 0) / 
                          Math.max(1, (selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_ordered, 0)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all"
                        style={{
                          width: `${((selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_received, 0) / 
                            Math.max(1, (selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_ordered, 0)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold shadow-sm"
                    onClick={() => setIsSelectionExpanded(true)}
                  >
                    Switch Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Select an Active Job</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">Pick a production workflow to view its status and log deliveries</p>
                </div>
                {selectedJob && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs font-bold text-gray-600 hover:text-gray-900"
                    onClick={() => setIsSelectionExpanded(false)}
                  >
                    Collapse Grid ✕
                  </Button>
                )}
              </div>

              {safeJobs.length === 0 ? (
                <Card className="border-dashed border-2 py-12">
                  <CardContent className="text-center text-muted-foreground font-medium">
                    No active production jobs found. Please create a job first.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {safeJobs.map((job) => {
                    const isSelected = selectedJobId === job.job_id.toString();
                    const status = getJobStatus(job as unknown as JobWithDeliveries);
                    const totalOrdered = (job.items ?? []).reduce((sum, item) => sum + item.quantity_ordered, 0);
                    const totalReceived = (job.items ?? []).reduce((sum, item) => sum + item.quantity_received, 0);
                    const overallProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

                    return (
                      <Card
                        key={job.job_id}
                        className={`cursor-pointer transition-all duration-300 group hover:shadow-lg ${
                          isSelected
                            ? "border-2 border-blue-600 bg-blue-50/40 shadow-md ring-1 ring-blue-600/10 scale-[1.01]"
                            : "border-gray-200 hover:border-gray-300 hover:scale-[1.01]"
                        }`}
                        onClick={() => handleJobSelect(job.job_id.toString())}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-bold text-blue-600 font-mono">JOB #{job.job_id}</span>
                              <CardTitle className="text-base font-bold mt-1 text-gray-900">
                                {job.service_category || "Service Category"}
                              </CardTitle>
                            </div>
                            <Badge className={`${getStatusColor(status)} font-bold text-[10px] uppercase border`}>
                              {status.replace("_", " ")}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-4">
                          <div className="text-xs">
                            <span className="block font-bold text-gray-700 uppercase tracking-tight text-[10px]">Artisans Involved</span>
                            <span className="block mt-1 font-medium truncate text-gray-600" title={job.artisans_involved?.join(', ')}>
                              {job.artisans_involved?.join(', ') || 'N/A'}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              <span>Delivery Progress</span>
                              <span>{overallProgress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${overallProgress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t text-[11px] font-medium">
                            <span className="text-muted-foreground">
                              Created {new Date(job.created_date).toLocaleDateString()}
                            </span>
                            <span className="font-bold text-blue-700">
                              Ksh {Number(job.total_cost || 0).toLocaleString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Job Items */}
          {selectedJob && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg font-bold">Job Items</CardTitle>
                <CardDescription className="text-xs">Select an item to record a delivery and track production fulfillment</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {(selectedJob.items ?? []).map((item) => {
                    const remaining = getRemainingQuantity(item)
                    const completion = getCompletionPercentage(item)
                    const rejected = item.quantity_received - item.quantity_accepted;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                          selectedItemId === item.id 
                            ? "border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500/10 scale-[1.01]" 
                            : "border-gray-200 hover:bg-gray-50/50 hover:scale-[1.005]"
                        }`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
                          <div>
                            <Badge variant="outline" className="text-sm font-bold py-0.5 px-2 bg-white border-blue-200 text-blue-800">
                              {getProductDisplay(item.product)}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                              <span className="font-bold text-gray-700 uppercase text-[10px] tracking-tight mr-1">Artisan:</span> {getArtisanDisplay(item.artisan)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-extrabold text-gray-900">
                              Ksh {Number(item.final_payment || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Payment</p>
                            <p className="text-[11px] font-medium text-muted-foreground mt-1">
                              Expected: Ksh {Number(item.original_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Fulfillment Progress</span>
                            <span className={completion === 100 ? "text-green-600" : "text-blue-600"}>{completion.toFixed(0)}% Complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                            <div
                              className={`h-2 rounded-full transition-all duration-700 ${
                                completion === 100 ? "bg-green-600" : "bg-blue-600"
                              }`}
                              style={{ width: `${completion}%` }}
                            ></div>
                          </div>

                          {/* Metric breakdown grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-center text-xs">
                            <div className="bg-white border-2 border-gray-100 p-2.5 rounded-lg shadow-sm">
                              <span className="block text-muted-foreground font-bold uppercase text-[9px] tracking-widest mb-1">Ordered</span>
                              <span className="block font-extrabold text-gray-900 text-sm">{item.quantity_ordered}</span>
                            </div>
                            <div className="bg-blue-50/50 border-2 border-blue-100/50 p-2.5 rounded-lg shadow-sm">
                              <span className="block text-blue-700 font-bold uppercase text-[9px] tracking-widest mb-1">Received</span>
                              <span className="block font-extrabold text-blue-900 text-sm">{item.quantity_received}</span>
                            </div>
                            <div className="bg-emerald-50/50 border-2 border-emerald-100/50 p-2.5 rounded-lg shadow-sm">
                              <span className="block text-emerald-700 font-bold uppercase text-[9px] tracking-widest mb-1">Accepted</span>
                              <span className="block font-extrabold text-emerald-900 text-sm">{item.quantity_accepted}</span>
                            </div>
                            <div className={`p-2.5 rounded-lg border-2 shadow-sm transition-colors ${
                              rejected > 0 
                                ? "bg-red-50 border-red-200" 
                                : "bg-gray-50/50 border-gray-100"
                            }`}>
                              <span className={`block font-bold uppercase text-[9px] tracking-widest mb-1 ${rejected > 0 ? "text-red-700" : "text-gray-400"}`}>Rejected</span>
                              <span className={`block font-extrabold text-sm ${rejected > 0 ? "text-red-600" : "text-gray-400"}`}>
                                {rejected}
                              </span>
                            </div>
                          </div>

                          {/* Alerts & Warning boxes for rejected items */}
                          {rejected > 0 && (
                            <div className="flex flex-col gap-1.5 text-xs bg-red-50 border border-red-150 p-3 rounded-lg mt-2 text-red-800 animate-pulse">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>⚠️</span>
                                <span>{rejected} items were damaged or rejected during quality check</span>
                              </div>
                              {item.rejection_reason && (
                                <p className="text-[11px] text-red-700/90 pl-6 font-medium">
                                  Reason: <span className="font-bold">{item.rejection_reason.replace("_", " ")}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {remaining > 0 ? (
                            <p className="text-xs text-amber-600 font-bold flex items-center gap-1.5 mt-2 bg-amber-50 w-fit px-2 py-1 rounded-md border border-amber-100">
                              <Clock className="h-3 w-3" /> {remaining} pieces remaining
                            </p>
                          ) : (
                            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-2 bg-emerald-50 w-fit px-2 py-1 rounded-md border border-emerald-100">
                              <CheckCircle className="h-3 w-3" /> Fully delivered
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Form */}
          {selectedItem && getRemainingQuantity(selectedItem) > 0 && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg font-bold">Record New Delivery</CardTitle>
                <CardDescription className="text-xs">
                  Log a batch of items received from the artisan for Job Item #{selectedItem.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="quantityReceived" className="font-bold text-xs uppercase text-gray-700 tracking-tight">Quantity Received</Label>
                      <Input
                        id="quantityReceived"
                        type="number"
                        min="1"
                        max={getRemainingQuantity(selectedItem)}
                        value={newDelivery.quantityReceived || ""}
                        onChange={(e) => {
                          const received = Number.parseInt(e.target.value) || 0;
                          setNewDelivery({
                            ...newDelivery,
                            quantityReceived: received,
                            quantityAccepted: received, // Default accepted to received
                          });
                        }}
                        className="font-bold border-gray-300"
                        placeholder="0"
                      />
                      <p className="text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-1.5 py-0.5 rounded">
                        MAX: {getRemainingQuantity(selectedItem)} PIECES
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantityAccepted" className="font-bold text-xs uppercase text-gray-700 tracking-tight">Quantity Accepted</Label>
                      <Input
                        id="quantityAccepted"
                        type="number"
                        min="0"
                        max={newDelivery.quantityReceived}
                        value={newDelivery.quantityAccepted || ""}
                        onChange={(e) =>
                          setNewDelivery({
                            ...newDelivery,
                            quantityAccepted: Number.parseInt(e.target.value) || 0,
                          })
                        }
                        className="font-bold border-gray-300"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {newDelivery.quantityAccepted < newDelivery.quantityReceived && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="rejectionReason" className="font-bold text-xs uppercase text-red-700 tracking-tight">Rejection Reason</Label>
                      <Select
                        value={newDelivery.rejectionReason}
                        onValueChange={(value) => setNewDelivery({ ...newDelivery, rejectionReason: value })}
                      >
                        <SelectTrigger className="border-red-200 bg-red-50 font-bold">
                          <SelectValue placeholder="Select reason for rejection" />
                        </SelectTrigger>
                        <SelectContent>
                          {rejectionReasons.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value} className="font-medium">
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="font-bold text-xs uppercase text-gray-700 tracking-tight">Delivery Notes</Label>
                    <Textarea
                      id="notes"
                      value={newDelivery.notes}
                      onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                      placeholder="Any notes about this delivery (optional)..."
                      className="border-gray-300 font-medium"
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleAddDelivery} disabled={newDelivery.quantityReceived === 0} className="w-full h-11 font-bold text-base shadow-sm">
                    <Plus className="mr-2 h-5 w-5" />
                    Record Delivery
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery History */}
          {selectedItem && (selectedItem.deliveries ?? []).length > 0 && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg font-bold">Delivery History</CardTitle>
                <CardDescription className="text-xs">Previous batches received for this production item</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {(selectedItem.deliveries ?? []).map((delivery) => (
                    <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-gray-900">
                            Rec: {delivery.quantity_received} | Acc: {delivery.quantity_accepted}
                          </p>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                            {new Date(delivery.delivery_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </p>
                          {delivery.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{delivery.notes}"</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        {delivery.rejection_reason && (
                          <Badge variant="destructive" className="text-[10px] font-bold uppercase px-2 py-0.5 shadow-sm border-none">
                            {rejectionReasons.find((r) => r.value === delivery.rejection_reason)?.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          {selectedJob && (
            <Card className="sticky top-6 shadow-md border-gray-200 overflow-hidden">
              <div className="h-2 bg-blue-600" />
              <CardHeader className="bg-gray-50/50 border-b">
                <CardTitle className="text-lg font-bold">Job Summary</CardTitle>
                <CardDescription className="text-xs font-medium">Detailed overview for Job #{selectedJob.job_id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Created By</Label>
                    <p className="text-sm font-bold text-gray-900">{selectedJob.created_by}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status</Label>
                    <div>
                      <Badge className={`${getStatusColor(getJobStatus(selectedJob))} font-bold text-[10px] uppercase border`}>
                        {getJobStatus(selectedJob).replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Service Category</Label>
                  <p className="text-sm font-bold text-gray-900 bg-gray-100 w-fit px-2 py-0.5 rounded-md">{selectedJob.service_category}</p>
                </div>

                <div className="space-y-2.5 pt-4 border-t">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-muted-foreground uppercase tracking-tight">Total Ordered:</span>
                    <span className="font-extrabold text-gray-900">
                      {(selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_ordered, 0)} Pcs
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-muted-foreground uppercase tracking-tight">Total Received:</span>
                    <span className="font-extrabold text-blue-700">
                      {(selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_received, 0)} Pcs
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-muted-foreground uppercase tracking-tight">Total Accepted:</span>
                    <span className="font-extrabold text-emerald-700">
                      {(selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_accepted, 0)} Pcs
                    </span>
                  </div>
                </div>

                <div className="pt-5 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-tight">Estimated Cost:</span>
                    <span className="font-bold text-gray-900">
                      Ksh {Number(selectedJob.total_cost || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <span className="text-xs font-bold uppercase text-emerald-800 tracking-tight">Final Payout:</span>
                    <span className="font-extrabold text-emerald-700 text-base">
                      Ksh {Number(selectedJob.total_final_payment || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedItem && (
                  <div className="pt-4 border-t animate-in fade-in zoom-in-95 duration-300">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Active Focus</Label>
                    <div className="mt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                      <p className="text-xs font-extrabold text-blue-900">
                        {getProductDisplay(selectedItem.product)}
                      </p>
                      <div className="flex justify-between items-center mt-2 text-[10px] font-bold uppercase">
                        <span className="text-blue-700/70">{selectedItem.quantity_received}/{selectedItem.quantity_ordered} Received</span>
                        <span className="text-amber-700 bg-amber-100/50 px-1.5 py-0.5 rounded">{getRemainingQuantity(selectedItem)} Left</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}