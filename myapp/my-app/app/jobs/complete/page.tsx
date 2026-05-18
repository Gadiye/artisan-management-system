"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Package, Plus } from "lucide-react"
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
        return "bg-blue-100 text-blue-800"
      case "PARTIALLY_RECEIVED":
        return "bg-yellow-100 text-yellow-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
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
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 mt-8">
          {[...Array(3)].map((_, i) => (
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
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Job Delivery Management</h1>
        <p className="text-muted-foreground mt-2">Record deliveries and track job completion progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Job Selection Grid */}
          {selectedJob && !isSelectionExpanded ? (
            <Card className="border border-blue-150 bg-blue-50/20 shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-650 text-white font-bold px-3 py-1.5 rounded text-sm font-mono shadow-sm">
                    JOB #{selectedJob.job_id}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      {selectedJob.service_category}
                      <Badge className={`${getStatusColor(getJobStatus(selectedJob))} text-[10px] font-semibold uppercase tracking-wider py-0.5 px-1.5`}>
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
                        className="bg-blue-650 h-1 rounded-full transition-all"
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
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                    onClick={() => setIsSelectionExpanded(true)}
                  >
                    🔄 Switch Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Select an Active Job</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Pick a woodcraft production workflow to view its status and log deliveries</p>
                </div>
                {selectedJob && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                    onClick={() => setIsSelectionExpanded(false)}
                  >
                    Collapse Grid ✕
                  </Button>
                )}
              </div>

              {safeJobs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
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
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isSelected
                            ? "border-2 border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600/20"
                            : "border-gray-200 hover:border-gray-300"
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
                            <Badge className={`${getStatusColor(status)} font-medium`}>
                              {status.replace("_", " ")}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-4">
                          <div className="text-xs text-muted-foreground">
                            <span className="block font-semibold text-gray-700">Artisans Involved:</span>
                            <span className="block mt-0.5 font-medium truncate text-gray-600" title={job.artisans_involved?.join(', ')}>
                              {job.artisans_involved?.join(', ') || 'N/A'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                              <span>Delivery Progress</span>
                              <span>{overallProgress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${overallProgress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t text-xs">
                            <span className="text-muted-foreground font-medium">
                              Created {new Date(job.created_date).toLocaleDateString()}
                            </span>
                            <span className="font-bold text-blue-700">
                              Ksh {Number(job.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <Card>
              <CardHeader>
                <CardTitle>Job Items</CardTitle>
                <CardDescription>Select an item to record a delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(selectedJob.items ?? []).map((item) => {
                    const remaining = getRemainingQuantity(item)
                    const completion = getCompletionPercentage(item)
                    const rejected = item.quantity_received - item.quantity_accepted;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedItemId === item.id 
                            ? "border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20" 
                            : "border-gray-200 hover:bg-gray-50/50"
                        }`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <div className="flex items-start justify-between mb-4 pb-2 border-b border-gray-100">
                          <div>
                            <Badge variant="outline" className="text-sm font-semibold py-0.5 px-2 bg-white">
                              {getProductDisplay(item.product)}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              <span className="font-semibold text-gray-700">Artisan:</span> {getArtisanDisplay(item.artisan)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              Ksh {Number(item.final_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current Payment (Accepted)</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Expected: Ksh {Number(item.original_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {item.service_rate_per_unit !== undefined && (
                              <p className="text-[11px] text-muted-foreground">
                                Rate: Ksh {Number(item.service_rate_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/unit
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>Fulfillment Progress</span>
                            <span>{completion.toFixed(0)}% complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                completion === 100 ? "bg-green-600" : "bg-blue-600"
                              }`}
                              style={{ width: `${completion}%` }}
                            ></div>
                          </div>

                          {/* Metric breakdown grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-center text-xs">
                            <div className="bg-gray-50 border border-gray-100 p-2 rounded">
                              <span className="block text-muted-foreground font-medium">Ordered</span>
                              <span className="block font-bold text-gray-900 text-sm mt-0.5">{item.quantity_ordered}</span>
                            </div>
                            <div className="bg-blue-50/50 border border-blue-100/50 p-2 rounded">
                              <span className="block text-blue-700 font-medium">Received</span>
                              <span className="block font-bold text-blue-950 text-sm mt-0.5">{item.quantity_received}</span>
                            </div>
                            <div className="bg-green-50/50 border border-green-100/50 p-2 rounded">
                              <span className="block text-green-700 font-medium">Accepted</span>
                              <span className="block font-bold text-green-950 text-sm mt-0.5">{item.quantity_accepted}</span>
                            </div>
                            <div className={`p-2 rounded border transition-colors ${
                              rejected > 0 
                                ? "bg-red-50 border-red-200 text-red-900" 
                                : "bg-gray-50 border-gray-150 text-gray-500"
                            }`}>
                              <span className="block font-medium">Rejected</span>
                              <span className={`block font-bold text-sm mt-0.5 ${rejected > 0 ? "text-red-700" : "text-gray-400"}`}>
                                {rejected}
                              </span>
                            </div>
                          </div>

                          {/* Alerts & Warning boxes for rejected items */}
                          {rejected > 0 && (
                            <div className="flex flex-col gap-1 text-xs bg-red-50 border border-red-150 p-2.5 rounded-md mt-2 text-red-800">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>⚠️</span>
                                <span>{rejected} items were damaged or rejected</span>
                              </div>
                              {item.rejection_reason && (
                                <p className="text-[11px] text-red-700/90 pl-5">
                                  Reason reported: <span className="font-semibold">{item.rejection_reason.replace("_", " ")}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {remaining > 0 ? (
                            <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mt-2">
                              <span>⏳</span> {remaining} pieces remaining to deliver
                            </p>
                          ) : (
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 mt-2">
                              <span>✅</span> Fully delivered
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
            <Card>
              <CardHeader>
                <CardTitle>Record New Delivery</CardTitle>
                <CardDescription>
                  Add a delivery for Job Item {selectedItem.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantityReceived">Quantity Received</Label>
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
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Max: {getRemainingQuantity(selectedItem)} pieces
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="quantityAccepted">Quantity Accepted</Label>
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
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {newDelivery.quantityAccepted < newDelivery.quantityReceived && (
                    <div>
                      <Label htmlFor="rejectionReason">Rejection Reason</Label>
                      <Select
                        value={newDelivery.rejectionReason}
                        onValueChange={(value) => setNewDelivery({ ...newDelivery, rejectionReason: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason for rejection" />
                        </SelectTrigger>
                        <SelectContent>
                          {rejectionReasons.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Delivery Notes</Label>
                    <Textarea
                      id="notes"
                      value={newDelivery.notes}
                      onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                      placeholder="Any notes about this delivery..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleAddDelivery} disabled={newDelivery.quantityReceived === 0} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Delivery
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery History */}
          {selectedItem && (selectedItem.deliveries ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery History</CardTitle>
                <CardDescription>Previous deliveries for this item</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(selectedItem.deliveries ?? []).map((delivery) => (
                    <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">
                            Received: {delivery.quantity_received}, Accepted: {delivery.quantity_accepted}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(delivery.delivery_date).toLocaleDateString()}
                          </p>
                          {delivery.notes && <p className="text-xs text-muted-foreground mt-1">{delivery.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        {delivery.rejection_reason && (
                          <Badge variant="destructive" className="text-xs">
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
        <div>
          {selectedJob && (
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Job Summary</CardTitle>
                <CardDescription>Job #{selectedJob.job_id} progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p className="text-sm text-muted-foreground">{selectedJob.created_by}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Service Category</Label>
                  <p className="text-sm text-muted-foreground">{selectedJob.service_category}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(getJobStatus(selectedJob))}>
                    {getJobStatus(selectedJob).replace("_", " ")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Ordered:</span>
                    <span className="font-medium">
                      {(selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_ordered, 0)} pieces
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Received:</span>
                    <span className="font-medium">
                      {(selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_received, 0)} pieces
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Accepted:</span>
                    <span className="font-medium">
                      {(selectedJob.items ?? []).reduce((sum, item) => sum + item.quantity_accepted, 0)} pieces
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Cost:</span>
                      <span className="font-medium">
                        Ksh {Number(selectedJob.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Final Payment:</span>
                      <span className="font-medium text-green-600">
                        Ksh {Number(selectedJob.total_final_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedItem && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium">Selected Item</Label>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium">
                        {getProductDisplay(selectedItem.product)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedItem.quantity_received}/{selectedItem.quantity_ordered} received
                      </p>
                      <p className="text-xs text-muted-foreground">{getRemainingQuantity(selectedItem)} remaining</p>
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