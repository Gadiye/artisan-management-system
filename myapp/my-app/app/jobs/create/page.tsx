"use client"

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, Check, Loader2, AlertCircle, Sparkles, FileSpreadsheet, Send, Copy, RotateCcw } from "lucide-react";
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

import { useArtisans, useInventory } from '@/hooks/useResource';
import { useCreateJob } from '@/hooks/useCreateJob';
import { JobItemPayload, CreateJobPayload } from '@/lib/api/types';
import { InventoryItem } from '@/types';
import { useProductPrice } from '@/hooks/useProductPrice';
import { splitPairsAndItems, formatPairsAndSingles } from "@/lib/utils";
import { usePairsInput } from "@/hooks/usePairsInput";

import {
  PRODUCT_TYPES,
  SERVICE_CATEGORIES,
  SIZE_CATEGORIES,
  ANIMAL_TYPES,
  PRODUCTION_CHAIN_MAP,
} from '@/lib/constants';

const getColorForString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorCombos = [
    "bg-blue-50/70 text-blue-700 border-blue-200 hover:bg-blue-100/70",
    "bg-emerald-50/70 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70",
    "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70",
    "bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100/70",
    "bg-purple-50/70 text-purple-700 border-purple-200 hover:bg-purple-100/70",
    "bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70",
    "bg-sky-50/70 text-sky-700 border-sky-200 hover:bg-sky-100/70",
    "bg-teal-50/70 text-teal-700 border-teal-200 hover:bg-teal-100/70",
  ];

  return colorCombos[Math.abs(hash) % colorCombos.length];
};

interface JobItemDisplay extends JobItemPayload {
  id: string;
  artisanName: string;
  total_price: number;
  product_type: string;
  animal_type: string;
  size_category: string;
  service_rate_per_unit?: number;
  product: number;
  quantity_ordered: number;
  original_amount: number;
  unit_of_measure?: string;
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
  const { data: inventory, loading: inventoryLoading, error: inventoryError } = useInventory();
  const { createJob, loading: createJobLoading, error: createJobError } = useCreateJob();

  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [jobItems, setJobItems] = useState<JobItemDisplay[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newJobId, setNewJobId] = useState<number | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [bypassInventoryDeduction, setBypassInventoryDeduction] = useState(false);

  const pairsInput = usePairsInput();

  const [currentItem, setCurrentItem] = useState({
    artisanId: 0,
    productType: "",
    animalType: "",
    sizeCategory: "",
    quantity: "",
  });

  const availableInventory = useMemo(() => {
    if (!inventory) return {};

    const sourceCategories = PRODUCTION_CHAIN_MAP[serviceCategory];

    let filteredInventory: InventoryItem[] = [];
    if (sourceCategories) {
      filteredInventory = inventory.filter(item => item.service_category && sourceCategories.includes(item.service_category));
    } else {
      filteredInventory = [];
    }

    const groupedInventory: { [key: string]: { [key: string]: number } } = {};

    filteredInventory.forEach(item => {
      if (item.product && item.product.product_type && item.product.animal_type) {
        const productType = item.product.product_type.toUpperCase();
        const animalType = item.product.animal_type.toUpperCase();

        if (!groupedInventory[productType]) {
          groupedInventory[productType] = {};
        }
        if (!groupedInventory[productType][animalType]) {
          groupedInventory[productType][animalType] = 0;
        }
        groupedInventory[productType][animalType] += item.quantity;
      }
    });
    return groupedInventory;
  }, [inventory, serviceCategory]);

  const CACHE_KEY = "create-job-cache";

  useEffect(() => {
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { serviceCategory, notes, jobItems, currentItem } = JSON.parse(cachedData);
      setServiceCategory(serviceCategory);
      setNotes(notes);
      setJobItems(jobItems);
      setCurrentItem(currentItem);
      if (currentItem.pairs || currentItem.singles) {
        // We need a way to restore pairs/singles if they were cached
        // For now, let's keep it simple and assume they'll re-enter
      }
    }

    const cachedRecentItems = localStorage.getItem(RECENT_ITEMS_CACHE_KEY);
    if (cachedRecentItems) {
      setRecentItems(JSON.parse(cachedRecentItems));
    }
  }, []);

  useEffect(() => {
    const dataToCache = JSON.stringify({
      serviceCategory,
      notes,
      jobItems,
      currentItem,
    });
    sessionStorage.setItem(CACHE_KEY, dataToCache);
  }, [serviceCategory, notes, jobItems, currentItem]);

  const shouldFetchPrice = !!(
    currentItem.productType &&
    currentItem.animalType &&
    currentItem.sizeCategory &&
    serviceCategory
  );

  const { data: productPrice, loading: priceLoading, error: priceError } = useProductPrice(
    currentItem.productType,
    currentItem.animalType,
    currentItem.sizeCategory,
    serviceCategory,
    { enabled: shouldFetchPrice }
  );

  const addJobItem = () => {
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
      quantityToOrder = pairsInput.totalQuantity;
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

    const ratePerUnit = productPrice.service_rate_per_unit ?? productPrice.price;
    if (typeof ratePerUnit !== 'number') {
      alert("Price or service rate not available for the selected options. Please ensure a rate is defined or a base price is set.");
      return;
    }

    let totalPrice = 0;
    if (productPrice.unit_of_measure === 'PAIRS') {
      const { pairs, singles } = splitPairsAndItems(quantityToOrder);
      totalPrice = (pairs * ratePerUnit) + (singles * (ratePerUnit / 2));
    } else {
      totalPrice = ratePerUnit * quantityToOrder;
    }

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
      original_amount: ratePerUnit,
      service_rate_per_unit: ratePerUnit,
      unit_price: ratePerUnit,
      unit_of_measure: productPrice.unit_of_measure,
    };

    setJobItems([...jobItems, newItem]);

    const newRecentItem: RecentItem = {
      productType: currentItem.productType,
      animalType: currentItem.animalType,
      sizeCategory: currentItem.sizeCategory,
    };

    const updatedRecentItems = [newRecentItem, ...recentItems.filter(
      item => !(item.productType === newRecentItem.productType &&
        item.animalType === newRecentItem.animalType &&
        item.sizeCategory === newRecentItem.sizeCategory)
    )].slice(0, 20);

    setRecentItems(updatedRecentItems);
    localStorage.setItem(RECENT_ITEMS_CACHE_KEY, JSON.stringify(updatedRecentItems));

    setCurrentItem({
      artisanId: currentItem.artisanId,
      productType: currentItem.productType,
      animalType: currentItem.animalType,
      sizeCategory: currentItem.sizeCategory,
      quantity: "",
    });
    pairsInput.reset();
  };

  const removeJobItem = (id: string) => {
    setJobItems(jobItems.filter((item) => item.id !== id));
  };

  const clearForm = () => {
    setCurrentItem({
      artisanId: currentItem.artisanId,
      productType: "",
      animalType: "",
      sizeCategory: "",
      quantity: "",
    });
    pairsInput.reset();
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
    });
    if (lastItem.unit_of_measure === 'PAIRS') {
      pairsInput.reset(lastItem.quantity_ordered);
    } else {
      pairsInput.reset(0);
    }
  };

  const totalJobValue = jobItems.reduce((sum, item) => sum + item.total_price, 0);
  const totalItems = jobItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const uniqueArtisansCount = new Set(jobItems.map((item) => item.artisan)).size;

  const isAddButtonDisabled =
    !currentItem.artisanId ||
    !currentItem.productType ||
    !currentItem.animalType ||
    (productPrice?.unit_of_measure === 'PAIRS' ? (pairsInput.totalQuantity === 0) : !currentItem.quantity) ||
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
      product_type: item.product_type,
      animal_type: item.animal_type,
      size_category: item.size_category,
      quantity_ordered: item.quantity_ordered,
      unit_price: item.original_amount,
      total_price: item.total_price,
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
          singles: "",
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
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Job Items");
    XLSX.writeFile(wb, "job_items.xlsx");
  };

  if (artisansLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
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
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Error Loading Roster</AlertTitle>
          <AlertDescription>{artisansError}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mt-4">Reload Page</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Create New Job</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">Assign work tasks to artisan teams and estimate production payroll piece-rates</p>
      </div>

      {createJobError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Error Creating Job</AlertTitle>
          <AlertDescription>{createJobError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Workspace Form inputs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-base font-bold text-gray-900">Job Specification</CardTitle>
              <CardDescription className="text-xs font-semibold">Define workflow stage and special instruction parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="serviceCategory" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Service Stage Category *</Label>
                <Select value={serviceCategory} onValueChange={setServiceCategory}>
                  <SelectTrigger className="bg-white border-gray-300 font-medium text-sm h-11">
                    <SelectValue placeholder="Select target production stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((service) => (
                      <SelectItem key={service} value={service} className="text-sm font-semibold">
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  This specifies the production stage being allocated (e.g. CARVING, SANDING, PAINTING)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Notes & Directions (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter custom instructions, quality control reminders, or deadline constraints..."
                  className="border-gray-300 font-medium text-sm min-h-[90px] focus-visible:ring-offset-0 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t">
                <Checkbox id="bypass-inventory" checked={bypassInventoryDeduction} onCheckedChange={(checked) => setBypassInventoryDeduction(checked === true)} />
                <div className="grid gap-0.5 leading-none">
                  <label
                    htmlFor="bypass-inventory"
                    className="text-xs font-extrabold text-gray-900 cursor-pointer uppercase tracking-wider"
                  >
                    Bypass Inventory Constraints
                  </label>
                  <p className="text-[10px] text-muted-foreground font-semibold">Allow assignment even if intermediate stage stocks are insufficient</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentItems.length > 0 && (
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b pb-4">
                <CardTitle className="text-base font-bold text-gray-900">Recent Assignments</CardTitle>
                <CardDescription className="text-xs font-semibold">Click a capsule tag below to quickly auto-populate the item selector</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-6">
                {recentItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`h-9 border font-semibold text-xs px-3.5 rounded-full transition-all duration-200 uppercase ${getColorForString(item.productType)}`}
                    onClick={() => {
                      setCurrentItem({
                        ...currentItem,
                        productType: item.productType,
                        animalType: item.animalType,
                        sizeCategory: item.sizeCategory,
                      });
                    }}
                  >
                    {item.productType.replace(/_/g, " ")} • {item.animalType} • {item.sizeCategory.replace(/_/g, " ")}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-base font-bold text-gray-900">Assign Job Items</CardTitle>
              <CardDescription className="text-xs font-semibold">Associate specific product size profiles and quantities to craftsmen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="artisan" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Select Artisan *</Label>
                  <Select
                    value={String(currentItem.artisanId)}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, artisanId: Number.parseInt(value) })}
                    disabled={artisansLoading || !!artisansError}
                  >
                    <SelectTrigger className="bg-white border-gray-300 font-medium text-sm h-11">
                      <SelectValue placeholder="Choose target artisan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {artisans?.map((artisan) => (
                        artisan.id !== undefined && artisan.id !== null ? (
                          <SelectItem key={artisan.id} value={artisan.id.toString()} className="text-sm font-semibold">
                            {artisan.name}
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="productType" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Product Category *</Label>
                  <Select
                    value={currentItem.productType}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, productType: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 font-medium text-sm h-11">
                      <SelectValue placeholder="Choose product category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-sm font-semibold">
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="animalType" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Animal Profile *</Label>
                  <Select
                    value={currentItem.animalType}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, animalType: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 font-medium text-sm h-11">
                      <SelectValue placeholder="Choose animal type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-sm font-semibold">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sizeCategory" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Size Segment *</Label>
                  <Select
                    value={currentItem.sizeCategory}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, sizeCategory: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 font-medium text-sm h-11">
                      <SelectValue placeholder="Choose size category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_CATEGORIES.map((size) => (
                        <SelectItem key={size} value={size} className="text-sm font-semibold">
                          {size.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Inventory Availability Info Box */}
                <div className="md:col-span-2">
                  {currentItem.productType && currentItem.animalType && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-gray-700 animate-in fade-in duration-200 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-indigo-500" />
                      <span>
                        Stage Stock:{" "}
                        <strong className="text-gray-950 font-extrabold">
                          {(() => {
                            const totalAvailable = availableInventory[currentItem.productType]?.[currentItem.animalType] || 0;
                            if (productPrice?.unit_of_measure === 'PAIRS') {
                              const { pairs, singles } = splitPairsAndItems(totalAvailable);
                              return `${pairs} pairs, ${singles} singles (${totalAvailable} individual items)`;
                            } else {
                              return `${totalAvailable} items`;
                            }
                          })()}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="quantity" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Allocated Quantity *</Label>
                  {productPrice?.unit_of_measure === 'PAIRS' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase">Pairs</Label>
                          <Input
                            type="number"
                            min="0"
                            value={pairsInput.pairs}
                            onChange={(e) => pairsInput.setPairs(e.target.value)}
                            placeholder="0"
                            className="h-11 border-gray-300 font-extrabold text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase">Singles</Label>
                          <Input
                            type="number"
                            min="0"
                            value={pairsInput.singles}
                            onChange={(e) => pairsInput.setSingles(e.target.value)}
                            placeholder="0"
                            className="h-11 border-gray-300 font-extrabold text-sm"
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
                      </div>
                      <div className="flex justify-end">
                        <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border-slate-200">
                          Total: {pairsInput.totalQuantity} individual items
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: String(Math.max(1, Number.parseInt(e.target.value) || 1)) })}
                      placeholder="Enter quantity amount..."
                      className="h-11 border-gray-300 font-extrabold text-sm"
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
              </div>

              {priceLoading && (
                <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Retrieving piece-rate data from pricing index...</span>
                </div>
              )}

              {priceError && (
                <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50 text-red-950 text-xs">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle>Price Error</AlertTitle>
                  <AlertDescription>{priceError}</AlertDescription>
                </Alert>
              )}

              {productPrice && !priceLoading && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Calculator className="h-4 w-4 text-emerald-500" />
                    <span>
                      Estimated Unit Rate:{" "}
                      <strong className="text-sm font-extrabold text-emerald-600">
                        Ksh {Number(productPrice.service_rate_per_unit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[10px] text-muted-foreground ml-1">({productPrice.unit_of_measure || 'EACH'})</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold ml-6">Product ID: {productPrice.id}</p>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t mt-6">
                <Button
                  onClick={addJobItem}
                  disabled={isAddButtonDisabled}
                  className="flex-1 h-11 font-bold text-xs uppercase px-5 shadow-md shadow-primary/20 hover:scale-[1.01]"
                >
                  <Plus className="mr-2 h-4 w-4 stroke-[3]" />
                  Add Job Item
                </Button>
                <Button
                  onClick={clearForm}
                  variant="outline"
                  className="h-11 px-4 text-xs font-bold uppercase border-gray-300"
                >
                  <RotateCcw className="mr-2 h-4 w-4 stroke-[2.5]" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {jobItems.length > 0 && (
            <Card className="border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
              <CardHeader className="bg-gray-50/50 border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">Assigned Job Items ({jobItems.length})</CardTitle>
                  <CardDescription className="text-xs font-semibold">Active workload lines declared in compile queue</CardDescription>
                </div>
                <Button onClick={duplicateLastItem} variant="outline" size="sm" className="h-8 font-bold text-[10px] uppercase border-gray-300 px-3">
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Last Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/30">
                    <TableRow>
                      <TableHead className="font-bold text-gray-700 text-xs pl-6">Artisan Profile</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs">Product Details</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs text-right">Qty</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs text-right">Piece Rate</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs text-right">Line Total</TableHead>
                      <TableHead className="text-center pr-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobItems.sort((a, b) => a.product_type.localeCompare(b.product_type)).map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/20 transition-colors">
                        <TableCell className="font-extrabold text-sm pl-6 py-3.5 text-gray-950">{item.artisanName}</TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-gray-950">{item.product_type.replace(/_/g, " ")}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">• {item.animal_type} • {item.size_category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-gray-800 py-3.5">
                          {formatPairsAndSingles(item.quantity_ordered, item.unit_of_measure)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-gray-600 py-3.5">
                          Ksh {item.original_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-gray-950 py-3.5">
                          Ksh {item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center pr-6 py-3.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeJobItem(item.id)}
                            className="h-8 w-8 p-0 rounded-full border border-transparent hover:border-gray-200 hover:bg-gray-100 text-rose-600 transition-all flex items-center justify-center mx-auto"
                            title="Remove Line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Sticky Summary Card */}
        <div>
          <Card className="sticky top-6 border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-base font-bold text-gray-900">Job Summary</CardTitle>
              <CardDescription className="text-xs font-semibold">Review parameters before compiling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Service Stage</Label>
                <div className="font-extrabold text-sm text-gray-950">{serviceCategory || "— Not Specified —"}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-150">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Total Pieces</Label>
                  <div className="font-extrabold text-sm text-gray-900">{totalItems} pcs</div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Artisans</Label>
                  <div className="font-extrabold text-sm text-gray-900">{uniqueArtisansCount} active</div>
                </div>
              </div>

              <div className="py-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Cumulative Value</Label>
                  <span className="text-xl font-black text-emerald-600">
                    Ksh {totalJobValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={handleExport}
                  className="w-full h-11 font-bold text-xs uppercase px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                  variant="outline"
                  disabled={jobItems.length === 0}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
                  Export to Spreadsheet
                </Button>

                <Button
                  onClick={handleSubmit}
                  className="w-full h-11 font-bold text-xs uppercase px-4 shadow-md shadow-primary/20 hover:scale-[1.01]"
                  disabled={jobItems.length === 0 || !serviceCategory || createJobLoading}
                >
                  {createJobLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4 stroke-[2.5]" />
                  )}
                  {createJobLoading ? "Compiling Order..." : "Create Job"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md border-gray-250 p-6 rounded-2xl shadow-xl">
          <DialogHeader className="pb-3 border-b text-center sm:text-left">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
              <Check className="h-6 w-6 text-emerald-500 stroke-[3.5] bg-emerald-50 rounded-full p-1" />
              Job Assigned Successfully
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
              Job record #{newJobId} has been added to active pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 mt-4">
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Service Category:</span>
              <span className="font-extrabold text-gray-950">{serviceCategory}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Total Volume:</span>
              <span className="font-extrabold text-gray-950">{totalItems} pieces</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Payroll Est:</span>
              <span className="font-black text-emerald-600">Ksh {totalJobValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={handleCreateAnother} className="h-11 px-4 text-xs font-bold uppercase sm:flex-1">
              Assign Another
            </Button>
            <Button onClick={handleViewJob} className="h-11 px-5 text-xs font-bold uppercase sm:flex-1 shadow-md">
              View details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}