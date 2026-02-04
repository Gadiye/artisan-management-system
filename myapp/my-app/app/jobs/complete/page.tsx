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
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
              <CardDescription>Choose a job to record deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobId} onValueChange={handleJobSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {safeJobs.map((job) => (
                    <SelectItem key={job.job_id} value={job.job_id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          Job #{job.job_id} - {job.artisans_involved?.join(', ') || job.created_by}
                        </span>
                        <Badge className={`ml-2 ${getStatusColor(getJobStatus(job as unknown as JobWithDeliveries))}`}>
                          {getJobStatus(job as unknown as JobWithDeliveries).replace("_", " ")}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

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

                    return (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedItemId === item.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                          }`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <Badge variant="outline">
                              {getProductDisplay(item.product)}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Artisan: {getArtisanDisplay(item.artisan)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(Number(item.original_amount) * item.quantity_accepted).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Current payment</p>
                            {item.service_rate_per_unit !== undefined && (
                              <p className="text-xs text-muted-foreground">Rate: ${item.service_rate_per_unit.toFixed(2)}/unit</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>
                              Progress: {item.quantity_received}/{item.quantity_ordered}
                            </span>
                            <span>{completion.toFixed(0)}% complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${completion}%` }}></div>
                          </div>
                          {remaining > 0 && (
                            <p className="text-xs text-muted-foreground">{remaining} pieces remaining to deliver</p>
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
                        ${selectedJob.total_cost?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Final Payment:</span>
                      <span className="font-medium text-green-600">
                        ${selectedJob.total_final_payment?.toFixed(2) || "0.00"}
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