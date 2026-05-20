"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Warehouse, Layers, Boxes, DollarSign, Clock, Sparkles, Filter, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory, useReports } from '@/hooks/useResource';
import { Product } from "@/types";
import { TransactionHistoryModal } from "@/components/transaction-history-modal";
import { SERVICE_STAGES, getStageColor } from '@/lib/constants';
import { splitPairsAndItems } from "@/lib/utils";



interface EnrichedInventoryItem {
  id: number;
  quantity: number;
  average_cost: number;
  last_updated: string;
  product: {
    id: number;
    product_type: string;
    animal_type: string;
    size_category: string;
    unit_of_measure?: string;
  };
  service_category: string;
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

function getStagePastTense(stage: string): string {
  switch (stage.toUpperCase()) {
    case "DRAWING":
      return "DRAWN";
    case "CARVING":
      return "CARVED";
    case "CUTTING":
      return "CUT";
    case "GOUGING":
      return "GOUGED";
    case "SANDING":
      return "SANDED";
    case "PAINTING":
      return "PAINTED";
    case "FINISHING":
      return "FINISHED";
    default:
      return stage;
  }
}

export default function InventoryPage() {
  const { data: inventory, loading: inventoryLoading, error: inventoryError } = useInventory();
  const { data: reportsData } = useReports();

  const [selectedProductType, setSelectedProductType] = useState("all");
  const [selectedAnimalType, setSelectedAnimalType] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const safeInventory = useMemo(() => Array.isArray(inventory) ? inventory : [], [inventory]);


  const filteredInventory = useMemo(() => {
    const enrichedInventory: EnrichedInventoryItem[] = safeInventory.map(inventoryItem => {
      return {
        id: inventoryItem.id,
        quantity: inventoryItem.quantity,
        average_cost: Number(inventoryItem.average_cost || 0),
        last_updated: inventoryItem.last_updated,
        product: inventoryItem.product,
        service_category: inventoryItem.service_category || 'N/A',
      };
    }).filter(item => item.service_category !== 'FINISHED'); // Filter out FINISHED items

    let finalFiltered = enrichedInventory;

    if (selectedProductType !== "all") {
      finalFiltered = finalFiltered.filter(item => item.product.product_type === selectedProductType);
    }
    if (selectedAnimalType !== "all") {
      finalFiltered = finalFiltered.filter(item => item.product.animal_type === selectedAnimalType);
    }
    if (selectedStage !== "all") {
      finalFiltered = finalFiltered.filter(item => item.service_category === selectedStage);
    }
    return finalFiltered;
  }, [safeInventory, selectedProductType, selectedAnimalType, selectedStage]);

  const totalInventoryValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * item.average_cost), 0);
  const totalItems = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  const readyForNextStage = totalItems;

  // Finished products are now handled by a separate page
  const finishedProductsCount = 0; // This page does not display finished products

  const productTypesOptions = useMemo(() => {
    const types = new Set<string>();
    safeInventory.forEach(i => types.add(i.product.product_type));
    return ["all", ...Array.from(types)];
  }, [safeInventory]);

  const animalTypesOptions = useMemo(() => {
    const types = new Set<string>();
    safeInventory.forEach(i => types.add(i.product.animal_type));
    return ["all", ...Array.from(types)];
  }, [safeInventory]);

  if (inventoryLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center border-b pb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
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

  if (inventoryError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{getErrorMessage(inventoryError)}</AlertDescription>
        </Alert>
        <Button onClick={() => { /* refetchInventory(); */ }} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Warehouse className="h-8 w-8 text-blue-600" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Track and trace stock levels across all active production and processing stages
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-150 px-3 py-1.5 rounded-full shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Real-time Logistics Console</span>
        </div>
      </div>

      {/* Inventory Statistics - Glassmorphic Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Layers className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{totalItems}</div>
            <p className="text-xs text-blue-800/80 font-medium mt-1">Across all work-in-progress</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-emerald-800/80 font-medium mt-1">Valuation of WIP stock</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Boxes className="h-16 w-16 text-purple-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse"></span>
              Next Stage Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-600 tracking-tight">{readyForNextStage}</div>
            <p className="text-xs text-purple-800/80 font-medium mt-1">Items awaiting assignment</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-orange-100 bg-gradient-to-br from-orange-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Clock className="h-16 w-16 text-orange-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-600"></span>
              Avg. Process Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-orange-600 tracking-tight">
              {reportsData?.summary?.avg_process_time !== undefined 
                ? `${reportsData.summary.avg_process_time} Days` 
                : "4.2 Days"
              }
            </div>
            <p className="text-xs text-orange-800/80 font-medium mt-1">Cycle time efficiency</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Inventory Filters */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-lg font-bold">Logistics Filters</CardTitle>
              </div>
              <CardDescription className="text-xs font-medium">Refine WIP stock view by stage or type</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-700 tracking-widest">Product Type</label>
                <Select value={selectedProductType} onValueChange={setSelectedProductType}>
                  <SelectTrigger className="bg-white border-gray-300 font-medium text-xs">
                    <SelectValue placeholder="All Product Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypesOptions.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type === "all" ? "All Product Types" : type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-700 tracking-widest">Animal Category</label>
                <Select value={selectedAnimalType} onValueChange={setSelectedAnimalType}>
                  <SelectTrigger className="bg-white border-gray-300 font-medium text-xs">
                    <SelectValue placeholder="All Animals" />
                  </SelectTrigger>
                  <SelectContent>
                    {animalTypesOptions.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type === "all" ? "All Animals" : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-700 tracking-widest">Production Stage</label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="bg-white border-gray-300 font-medium text-xs">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                    {SERVICE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage} className="text-xs">
                        {getStagePastTense(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Work-In-Progress Stock</CardTitle>
                  <CardDescription className="text-xs font-medium">Current node distribution across the production pipeline</CardDescription>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search inventory..." className="pl-9 h-9 text-xs" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/70">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs">Product Details</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Current Stage</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Qty</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Avg Cost</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">WIP Value</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Traceability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                        No WIP stock found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item: EnrichedInventoryItem) => (
                      <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          <div className="font-bold text-gray-900 text-sm">{(item.product.product_type ?? '').replace(/_/g, " ")}</div>
                          <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                            {item.product.animal_type} • {(item.product.size_category ?? '').replace(/_/g, " ")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={`font-bold text-[10px] uppercase border px-2 py-0.5 ${getStageColor(item.service_category)}`}
                          >
                            {getStagePastTense(item.service_category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-extrabold text-sm text-gray-900">
                            {item.product.unit_of_measure === 'PAIRS' ?
                              (() => {
                                const { pairs, singles } = splitPairsAndItems(item.quantity);
                                return `${pairs}P / ${singles}S`;
                              })()
                              :
                              <>{item.quantity} Pcs</>
                            }
                          </div>
                          <div className="text-[10px] text-muted-foreground font-bold">({item.quantity} total)</div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-gray-600">
                          Ksh {item.average_cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-sm text-blue-700">
                          Ksh {(item.quantity * item.average_cost).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 font-bold text-[10px] uppercase tracking-wider border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
                            onClick={() => {
                              setSelectedProductId(item.product.id);
                              setIsModalOpen(true);
                            }}
                          >
                            Trace
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      <TransactionHistoryModal
        productId={selectedProductId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}