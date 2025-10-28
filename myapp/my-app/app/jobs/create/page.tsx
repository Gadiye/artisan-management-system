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
import { Checkbox } from "@/components/ui/checkbox";

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
  "GORILLA", "SAMPLE",
]

// Function to generate a consistent color based on a string
const getColorForString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorCombos = [
    "bg-blue-500 text-white border-blue-600",
    "bg-green-500 text-white border-green-600",
    "bg-yellow-500 text-gray-900 border-yellow-600",
    "bg-red-500 text-white border-red-600",
    "bg-purple-500 text-white border-purple-600",
    "bg-indigo-500 text-white border-indigo-600",
    "bg-pink-500 text-white border-pink-600",
    "bg-orange-500 text-white border-orange-600",
    "bg-teal-500 text-white border-teal-600",
    "bg-cyan-500 text-white border-cyan-600",
    "bg-lime-500 text-gray-900 border-lime-600",
    "bg-fuchsia-500 text-white border-fuchsia-600",
    "bg-rose-500 text-white border-rose-600",
    "bg-emerald-500 text-white border-emerald-600",
    "bg-violet-500 text-white border-violet-600",
    "bg-amber-500 text-gray-900 border-amber-600",
    "bg-sky-500 text-white border-sky-600",
    "bg-slate-600 text-white border-slate-700",
  ];
  
  return colorCombos[Math.abs(hash) % colorCombos.length];
};

interface JobItemDisplay extends JobItemPayload {
  id: string;
  artisanName: string;
  total_price: number; // Total price for this item
  product_type: string;
  animal_type: string;
  size_category: string;
  service_rate_per_unit?: number; // Add this new field
  product: number; // product ID
  quantity_ordered: number;
  original_amount: number;
}

interface RecentItem {
  productType: string;
  animalType: string;
  sizeCategory: string;
}

const RECENT_ITEMS_CACHE_KEY = "recent-job-items-cache";

export default function CreateJobPage() {
  const router = useRouter();
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { createJob, loading: createJobLoading, error: createJobError } = useCreateJob();

  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [jobItems, setJobItems] = useState<JobItemDisplay[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newJobId, setNewJobId] = useState<number | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [bypassInventoryDeduction, setBypassInventoryDeduction] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    artisanId: 0,
    productType: "",
    animalType: "",
    sizeCategory: "",
    quantity: "", // Default to 1 instead of 0
    pairs: "",
    singles: "",
  });

  // --- CACHING LOGIC ---
  const CACHE_KEY = "create-job-cache";

  useEffect(() => {
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { serviceCategory, notes, jobItems, currentItem } = JSON.parse(cachedData);
      setServiceCategory(serviceCategory);
      setNotes(notes);
      setJobItems(jobItems);
      setCurrentItem(currentItem);
    }

    const cachedRecentItems = localStorage.getItem(RECENT_ITEMS_CACHE_KEY);
    if (cachedRecentItems) {
      setRecentItems(JSON.parse(cachedRecentItems));
    }
  }, []);

  useEffect(() => {
    const dataToCache = JSON.stringify({ serviceCategory, notes, jobItems, currentItem });
    sessionStorage.setItem(CACHE_KEY, dataToCache);
  }, [serviceCategory, notes, jobItems, currentItem]);


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
    let quantityToOrder = 0;
    if (productPrice?.unit_of_measure === 'PAIRS') {
      const pairs = parseFloat(currentItem.pairs || '0');
      const singles = parseFloat(currentItem.singles || '0');
      quantityToOrder = (pairs * 2) + singles;
    } else {
      quantityToOrder = parseFloat(currentItem.quantity || '0');
    }

    if (quantityToOrder <= 0) {
      alert("Please enter a valid quantity.");
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

    // Use service_rate_per_unit for payment calculations, with fallback to base_price
    const ratePerUnit = productPrice.service_rate_per_unit ?? productPrice.price;
    if (typeof ratePerUnit !== 'number') {
      alert("Price or service rate not available for the selected options. Please ensure a rate is defined or a base price is set.");
      return;
    }

    const totalPrice = ratePerUnit * quantityToOrder;
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
      quantity_ordered: quantityToOrder,
      total_price: totalPrice,
      original_amount: ratePerUnit, // Now represents the rate per unit
      service_rate_per_unit: ratePerUnit,
    };

    console.log("Adding new item:", newItem);
    setJobItems([...jobItems, newItem]);

    const newRecentItem: RecentItem = {
      productType: currentItem.productType,
      animalType: currentItem.animalType,
      sizeCategory: currentItem.sizeCategory,
    };

    // Add to recent items, avoiding duplicates and limiting to 20
    const updatedRecentItems = [newRecentItem, ...recentItems.filter(
      item => !(item.productType === newRecentItem.productType &&
               item.animalType === newRecentItem.animalType &&
               item.sizeCategory === newRecentItem.sizeCategory)
    )].slice(0, 20);

    setRecentItems(updatedRecentItems);
    localStorage.setItem(RECENT_ITEMS_CACHE_KEY, JSON.stringify(updatedRecentItems));
    
    // Reset form but keep artisan selected
    setCurrentItem({
      artisanId: currentItem.artisanId,
      productType: currentItem.productType,
      animalType: currentItem.animalType,
      sizeCategory: currentItem.sizeCategory,
      quantity: "",
      pairs: "",
      singles: "",
    });
  };

  const removeJobItem = (id: string) => {
    setJobItems(jobItems.filter((item) => item.id !== id));
  };

  const clearForm = () => {
    setCurrentItem({
      artisanId: 0,
      productType: "",
      animalType: "",
      sizeCategory: "",
      quantity: "",
      pairs: "",
      singles: "",
    });
  };

  const duplicateLastItem = () => {
    if (jobItems.length === 0) {
      alert("There are no items to duplicate.");
      return;
    }
    const lastItem = jobItems[jobItems.length - 1];
    setCurrentItem({
      artisanId: lastItem.artisan,
      productType: lastItem.product_type,
      animalType: lastItem.animal_type,
      sizeCategory: lastItem.size_category,
      quantity: String(lastItem.quantity_ordered),
      pairs: "",
      singles: "",
    });
  };

  const totalJobValue = jobItems.reduce((sum, item) => sum + item.total_price, 0);
  const totalItems = jobItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const uniqueArtisansCount = new Set(jobItems.map((item) => item.artisan)).size;

  // Check if button should be disabled - removed productPrice.id requirement
  const isAddButtonDisabled = 
    !currentItem.artisanId ||
    !currentItem.productType ||
    !currentItem.animalType ||
    (productPrice?.unit_of_measure === 'PAIRS' ? (!currentItem.pairs && !currentItem.singles) : !currentItem.quantity) ||
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
      bypass_inventory_deduction: bypassInventoryDeduction,
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
          singles:"",
          pairs: "",
        });
        sessionStorage.removeItem(CACHE_KEY);
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
    sessionStorage.removeItem(CACHE_KEY);
  };

  const handleExport = async () => {
    if (jobItems.length === 0) {
      alert("There are no job items to export.");
      return;
    }

    const dataToExport = jobItems.map(item => ({
      "Artisan Name": item.artisanName,
      "Product Type": item.product_type,
      "Animal Type": item.animal_type,
      "Size Category": item.size_category,
      "Quantity Ordered": item.quantity_ordered,
      "Rate per Unit": item.original_amount,
      "Total Price": item.total_price,
    }));
  // Dynamically import the xlsx library
  const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Job Items");
    XLSX.writeFile(wb, "job_items.xlsx");
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
              <div className="flex items-center space-x-2">
                <Checkbox id="bypass-inventory" checked={bypassInventoryDeduction} onCheckedChange={setBypassInventoryDeduction} />
                <label
                  htmlFor="bypass-inventory"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Bypass inventory deduction
                </label>
              </div>
            </CardContent>
          </Card>

          {recentItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Items</CardTitle>
                <CardDescription>Click to pre-fill the form</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {recentItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={getColorForString(item.productType)}
                    onClick={() => {
                      setCurrentItem({
                        ...currentItem,
                        productType: item.productType,
                        animalType: item.animalType,
                        sizeCategory: item.sizeCategory,
                      });
                    }}
                  >
                    {item.productType.replace(/_/g, " ")} / {item.animalType} / {item.sizeCategory.replace(/_/g, " ")}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

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
                  {productPrice?.unit_of_measure === 'PAIRS' ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={currentItem.pairs}
                        onChange={(e) => setCurrentItem({ ...currentItem, pairs: e.target.value })}
                        placeholder="Pairs"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={currentItem.singles}
                        onChange={(e) => setCurrentItem({ ...currentItem, singles: e.target.value })}
                        placeholder="Singles"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!isAddButtonDisabled) {
                              addJobItem();
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <Input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: String(Math.max(1, Number.parseInt(e.target.value) || 1)) })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!isAddButtonDisabled) {
                            addJobItem();
                          }
                        }
                      }}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={addJobItem}
                    className="w-full"
                    disabled={isAddButtonDisabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                  <Button
                    onClick={clearForm}
                    className="w-full"
                    variant="outline"
                  >
                    Clear
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Job Items ({jobItems.length})</CardTitle>
                  <CardDescription>Items assigned to this job</CardDescription>
                </div>
                <Button onClick={duplicateLastItem} variant="outline" size="sm" disabled={jobItems.length === 0}>
                  Duplicate Last Item
                </Button>
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
                    {jobItems.sort((a, b) => a.product_type.localeCompare(b.product_type)).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.artisanName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.product_type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>{item.animal_type}</TableCell>
                        <TableCell>{item.size_category.replace(/_/g, " ")}</TableCell>
                        <TableCell>{item.quantity_ordered}</TableCell>
                        <TableCell>Ksh{typeof item.original_amount === 'number' ? item.original_amount.toFixed(2) : 'N/A'}</TableCell>
                        <TableCell className="font-medium">Ksh{typeof item.total_price === 'number' ? item.total_price.toFixed(2) : 'N/A'}</TableCell>
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
                                    <span className="text-lg font-bold">Ksh{totalJobValue.toFixed(2)}</span>
                                  </div>
                                </div>
                  
                                <Button
                                  onClick={handleExport}
                                  className="w-full mb-2" 
                                  variant="outline"
                                  disabled={jobItems.length === 0}>
                                    Export to Spreadsheet
                                </Button>
                  
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
                <span className="font-medium">Ksh{totalJobValue.toFixed(2)}</span>
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