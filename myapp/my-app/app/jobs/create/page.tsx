"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, Check, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Import API hooks and types
import { useArtisans } from '@/hooks/useResource';
import { useCreateJob } from '@/hooks/useCreateJob';
import { JobItemPayload, CreateJobPayload } from '@/lib/api/types';
import { useProductPrice } from '@/hooks/useProductPrice';

// --- CONSTANTS ---
const PRODUCT_TYPES = [
  "SITTING_ANIMAL", "YOGA_BOWLS", "PER_DAY", "YOGA_ANIMALS", "CHOPSTICK_HOLDERS",
  "STANDING_ANIMAL", "BOTTLE_CORKS", "SANTA_YOGA_BOWLS", "SANTA_YOGA_ANIMALS",
  "HEAD_BOWLS", "DRINKING_BOWLS", "ANIMAL_MASKS", "CHOPSTICK_HEADS",
  "CHESS_UNITS", "STOOL_SET", "SALAD_SERVERS_PAIR", "WALKING_ANIMAL",
  "PLACE_CARD_HOLDER", "SANTA_ANIMALS", "SUGAR_SPOONS", "COCKTAIL_STICKS",
  "KEY_HOLDERS", "FLAT_MAGNETS", "PLAY_ANIMALS", "TRAINING_CHOPSTICKS",
  "CHOPSTICKS", "X_MAS_DECO", "FORKS", "BUTTER_KNIVES", "LETTER_OPENERS",
  "JAM_SCOOPERS", "NAPKIN_HOLDERS", "HAIR_COMBS", "PAPER_WEIGHTS",  
]

const SERVICE_CATEGORIES = ["CARVING", "CUTTING", "PAINTING", "SANDING", "FINISHING", "FINISHED"]

const SIZE_CATEGORIES = [
  "SMALL", "MEDIUM", "LARGE", "WITH CLOTHES", "WITH DRESS", "WITH SUIT",
  "WITH OVERALL", "4IN", "8X8", "6X6", "5X4", "XMAS DRESS", "IN PAIRS", "12IN", "8IN", "N/A",
  "2D", "3D", "SHORT", "LONG", "THIN TIP", "THICK TIP", "NORMAL", "BOTTOMS UP",
]

const ANIMAL_TYPES = [
  "LION", "ZEBRA", "GIRAFFE", "DONKEY", "LEOPARD", "CHEETAH", "ELEPHANT",
  "CAT", "HIPPO", "GAZELLE", "LIONESS", "BUFFALO", "RHINO", "GUINEA FOWL",
  "GORILLA",
]

interface JobItemDisplay extends JobItemPayload {
  id: string;
  artisanName: string;
  total_price: number; // Total price for this item
  product_type: string;
  animal_type: string;
  size_category: string;
  service_rate_per_unit?: number; // Add this new field
}

export default function CreateJobPage() {
  const router = useRouter();
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { createJob, loading: createJobLoading, error: createJobError } = useCreateJob();

  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [jobItems, setJobItems] = useState<JobItemDisplay[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newJobId, setNewJobId] = useState<number | null>(null);

  const [currentItem, setCurrentItem] = useState({
    artisanId: 0,
    productType: "",
    animalType: "",
    sizeCategory: "",
    quantity: "", // Default to 1 instead of 0
  });

  // Enable the price query only when all required fields are filled
  const shouldFetchPrice = !!(
    currentItem.productType && 
    currentItem.animalType && 
    currentItem.sizeCategory &&
    serviceCategory // serviceCategory is now required
  );

  const { data: productPrice, loading: priceLoading, error: priceError } = useProductPrice(
    currentItem.productType,
    currentItem.animalType,
    currentItem.sizeCategory,
    serviceCategory, // Pass serviceCategory
    { enabled: shouldFetchPrice }
  );

  // Debug logging
  useEffect(() => {
    console.log("Current item state:", currentItem);
    console.log("Service category:", serviceCategory);
    console.log("Should fetch price:", shouldFetchPrice);
    console.log("Product price data:", productPrice);
    console.log("Price loading:", priceLoading);
    console.log("Price error:", priceError);
  }, [currentItem, serviceCategory, shouldFetchPrice, productPrice, priceLoading, priceError]);

  const addJobItem = () => {
    console.log("Add item button clicked");
    console.log("Validation checks:", {
      artisanId: currentItem.artisanId,
      productType: currentItem.productType,
      animalType: currentItem.animalType,
      serviceCategory: serviceCategory,
      quantity: currentItem.quantity,
      productPrice: productPrice,
      productPriceId: productPrice?.id,
    });

    if (!currentItem.artisanId) {
      alert("Please select an artisan");
      return;
    }
    if (!currentItem.productType) {
      alert("Please select a product type");
      return;
    }
    if (!currentItem.animalType) {
      alert("Please select an animal type");
      return;
    }
    if (currentItem.quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    if (!productPrice) {
      alert("Price information not available. Please try again.");
      return;
    }
    if (typeof productPrice.price !== 'number') {
      alert("Invalid price data. Please try again.");
      return;
    }

    if (!productPrice.id) {
      alert("Could not find a product ID for the selected options. Please try again.");
      return;
    }

    // Use service_rate_per_unit for payment calculations
    const ratePerUnit = productPrice.service_rate_per_unit;
    if (typeof ratePerUnit !== 'number') {
      alert("Service rate not available for the selected options. Please ensure a rate is defined.");
      return;
    }

    const totalPrice = ratePerUnit * currentItem.quantity;
    const selectedArtisan = artisans?.find((a) => a.id === currentItem.artisanId);

    if (!selectedArtisan) {
      alert("Selected artisan not found");
      return;
    }

    const newItem: JobItemDisplay = {
      id: Date.now().toString(),
      artisan: currentItem.artisanId,
      product: productPrice.id,
      artisanName: selectedArtisan.name,
      product_type: currentItem.productType,
      animal_type: currentItem.animalType,
      size_category: currentItem.sizeCategory,
      quantity_ordered: currentItem.quantity,
      total_price: totalPrice,
      original_amount: ratePerUnit, // Now represents the rate per unit
      service_rate_per_unit: ratePerUnit,
    };

    console.log("Adding new item:", newItem);
    setJobItems([...jobItems, newItem]);
    
    // Reset form but keep artisan selected
    setCurrentItem({
      artisanId: currentItem.artisanId,
      productType: "",
      animalType: "",
      sizeCategory: "MEDIUM",
      quantity: "",
    });
  };

  const removeJobItem = (id: string) => {
    setJobItems(jobItems.filter((item) => item.id !== id));
  };

  const totalJobValue = jobItems.reduce((sum, item) => sum + item.total_price, 0);
  const totalItems = jobItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const uniqueArtisansCount = new Set(jobItems.map((item) => item.artisan)).size;

  // Check if button should be disabled - removed productPrice.id requirement
  const isAddButtonDisabled = 
    !currentItem.artisanId ||
    !currentItem.productType ||
    !currentItem.animalType ||
    currentItem.quantity <= 0 ||
    priceLoading ||
    !productPrice ||
    typeof productPrice.price !== 'number';

  const handleSubmit = async () => {
    if (jobItems.length === 0 || !serviceCategory) {
      alert("Please add at least one job item and select a service category.");
      return;
    }

    const jobItemsPayload: JobItemPayload[] = jobItems.map(item => ({
      artisan: item.artisan,
      product: item.product,
      quantity_ordered: item.quantity_ordered,
    }));

    const payload: CreateJobPayload = {
      service_category: serviceCategory,
      notes: notes || "",
      items: jobItemsPayload,
    };

    try {
      const createdJob = await createJob(payload);
      if (createdJob) {
        setNewJobId(createdJob.job_id);
        setShowSuccessDialog(true);
        setJobItems([]);
        setServiceCategory("");
        setNotes("");
        setCurrentItem({
          artisanId: 0,
          productType: "",
          animalType: "",
          sizeCategory: "",
          quantity: "",
        });
      }
    } catch (error) {
      console.error("Submission error caught in component:", error);
    }
  };

  const handleViewJob = () => {
    if (newJobId) {
      router.push(`/jobs/${newJobId}`);
    }
  };

  const handleCreateAnother = () => {
    setShowSuccessDialog(false);
  };

  if (artisansLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-80 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader><CardContent><Skeleton className="h-60 w-full" /></CardContent></Card>
          </div>
          <div><Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card></div>
        </div>
      </div>
    );
  }

  if (artisansError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Artisans</AlertTitle>
          <AlertDescription>{artisansError}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mt-4">Reload Page</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Job</h1>
        <p className="text-muted-foreground mt-2">Assign work to artisans and calculate payments</p>
      </div>

      {createJobError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error Creating Job</AlertTitle>
          <AlertDescription>{createJobError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Set up the basic job information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serviceCategory">Service Category *</Label>
                <Select value={serviceCategory} onValueChange={setServiceCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This is the type of work being assigned (e.g., CARVING, PAINTING)
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes for this job..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Job Items</CardTitle>
              <CardDescription>Assign specific products to artisans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="artisan">Artisan *</Label>
                  <Select
                    value={String(currentItem.artisanId)}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, artisanId: Number.parseInt(value) })}
                    disabled={artisansLoading || !!artisansError}>
                      
                    <SelectTrigger>
                      <SelectValue placeholder="Select artisan" />
                    </SelectTrigger>
                    <SelectContent>
                      {artisans?.map((artisan) => (
                        artisan.id !== undefined && artisan.id !== null ? (
                          <SelectItem key={artisan.id} value={artisan.id.toString()}>
                            {artisan.name}
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="productType">Product Type *</Label>
                  <Select
                    value={currentItem.productType}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, productType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="animalType">Animal Type *</Label>
                  <Select
                    value={currentItem.animalType}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, animalType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select animal" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sizeCategory">Size Category</Label>
                  <Select
                    value={currentItem.sizeCategory}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, sizeCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_CATEGORIES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: Math.max(1, Number.parseInt(e.target.value) || 1) })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={addJobItem}
                    className="w-full"
                    disabled={isAddButtonDisabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Debug information */}
              <div className="text-xs text-muted-foreground border p-2 rounded">
                <p>Debug: Button disabled = {isAddButtonDisabled ? 'true' : 'false'}</p>
                <p>Artisan ID: {currentItem.artisanId}</p>
                <p>Product Price Available: {productPrice ? 'Yes' : 'No'}</p>
                <p>Product Price ID: {productPrice?.id || 'Not available - using fallback'}</p>
                <p>Product Price Value: {productPrice?.price || 'N/A'}</p>
              </div>

              {priceLoading && (
                <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Fetching price...</span>
                </div>
              )}

              {priceError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Price Error</AlertTitle>
                  <AlertDescription>{priceError}</AlertDescription>
                </Alert>
              )}

              {productPrice && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span className="text-sm">
                      Estimated unit price:{" "}
                      <strong>
                        ${productPrice.service_rate_per_unit?.toFixed(2) || 'N/A'}
                      </strong>
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Product ID: {productPrice.id || 'Using fallback identifier'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {jobItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Job Items ({jobItems.length})</CardTitle>
                <CardDescription>Items assigned to this job</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artisan</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.artisanName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.product_type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>{item.animal_type}</TableCell>
                        <TableCell>{item.size_category.replace(/_/g, " ")}</TableCell>
                        <TableCell>{item.quantity_ordered}</TableCell>
                        <TableCell>${item.original_amount.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${item.total_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeJobItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Job Summary</CardTitle>
              <CardDescription>Review before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Service Category</Label>
                <p className="text-sm text-muted-foreground">{serviceCategory || "Not selected"}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Total Items</Label>
                <p className="text-sm text-muted-foreground">{totalItems} pieces</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Artisans Involved</Label>
                <p className="text-sm text-muted-foreground">{uniqueArtisansCount} artisans</p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Total Job Value</Label>
                  <span className="text-lg font-bold">${totalJobValue.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={jobItems.length === 0 || !serviceCategory || createJobLoading}
              >
                {createJobLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Job
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-6 w-6 text-green-500 mr-2" />
              Job Created Successfully
            </DialogTitle>
            <DialogDescription>
              Job #{newJobId} has been created with {jobItems.length} items.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Service Category:</span>
                <span className="font-medium">{serviceCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Items:</span>
                <span className="font-medium">{totalItems} pieces</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Value:</span>
                <span className="font-medium">${totalJobValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCreateAnother} className="sm:flex-1">
              Create Another Job
            </Button>
            <Button onClick={handleViewJob} className="sm:flex-1">
              View Job Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
