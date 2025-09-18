"use client"

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProducts, useInventory } from '@/hooks/useResource';


interface EnrichedInventoryItem {
  id: number; // InventoryItem ID
  quantity: number;
  average_cost: number;
  last_updated: string; // From InventoryItem

  // Product details (from Product model)
  product_id: number; // The ID of the associated product
  product_type: string;
  animal_type: string;
  service_category: string; // This is the service_category from InventoryItem
  base_price: number; // From Product
  product_last_price_update: string; // From Product
}



const serviceStages = ["CARVING", "SANDING", "PAINTING", "FINISHED"]

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    CARVING: "bg-blue-100 text-blue-800",
    SANDING: "bg-yellow-100 text-yellow-800",
    PAINTING: "bg-purple-100 text-purple-800",
    FINISHED: "bg-green-100 text-green-800",
  }
  return colors[stage] || "bg-gray-100 text-gray-800"
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

export default function InventoryPage() {
  const { data: products, loading: productsLoading, error: productsError } = useProducts();
  const { data: inventory, loading: inventoryLoading, error: inventoryError } = useInventory();

  const [selectedProductType, setSelectedProductType] = useState("all");
  const [selectedAnimalType, setSelectedAnimalType] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  const readyForNextStage = "N/A"; // Moved declaration to the top

  const safeProducts = useMemo(() => products || [], [products]);
  const safeInventory = useMemo(() => Array.isArray(inventory) ? inventory : [], [inventory]);

  const filteredInventory = useMemo(() => {
    const enrichedInventory: EnrichedInventoryItem[] = safeInventory.map(inventoryItem => {
      const productDetail = safeProducts.find(p => p.id === Number(inventoryItem.product.id));
      console.log("Inventory Item:", inventoryItem);
      console.log("Product Detail Found:", productDetail);
      console.log("safeProducts:", safeProducts);
      return {
        id: inventoryItem.id,
        quantity: inventoryItem.quantity,
        average_cost: Number(inventoryItem.average_cost || 0),
        last_updated: inventoryItem.last_updated,
        product_id: inventoryItem.product,
        product_type: productDetail?.product_type || 'N/A',
        animal_type: productDetail?.animal_type || 'N/A',
        service_category: inventoryItem.service_category || 'N/A',
        base_price: productDetail?.base_price || 0,
        product_last_price_update: productDetail?.last_price_update || 'N/A',
      };
    }).filter(item => item.service_category !== 'FINISHED'); // Filter out FINISHED items

    let finalFiltered = enrichedInventory;

    if (selectedProductType !== "all") {
      finalFiltered = finalFiltered.filter(item => item.product_type === selectedProductType);
    }
    if (selectedAnimalType !== "all") {
      finalFiltered = finalFiltered.filter(item => item.animal_type === selectedAnimalType);
    }
    if (selectedStage !== "all") {
      finalFiltered = finalFiltered.filter(item => item.service_category === selectedStage);
    }
    return finalFiltered;
  }, [safeProducts, safeInventory, selectedProductType, selectedAnimalType, selectedStage]);

  const totalInventoryValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * item.average_cost), 0);
  const totalItems = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);

  // Finished products are now handled by a separate page
  const finishedProductsCount = 0; // This page does not display finished products

  const productTypesOptions = useMemo(() => {
    const types = new Set<string>();
    safeProducts.forEach(p => types.add(p.product_type));
    return ["all", ...Array.from(types)];
  }, [safeProducts]);

  const animalTypesOptions = useMemo(() => {
    const types = new Set<string>();
    safeProducts.forEach(p => types.add(p.animal_type));
    return ["all", ...Array.from(types)];
  }, [safeProducts]);

  if (productsLoading || inventoryLoading) {
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

  if (productsError || inventoryError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{getErrorMessage(productsError) || getErrorMessage(inventoryError)}</AlertDescription>
        </Alert>
        <Button onClick={() => { /* refetchProducts(); refetchInventory(); */ }} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground mt-2">Track stock levels across production stages</p>
      </div>

      {/* Inventory Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Inventory valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready for Next Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyForNextStage}</div>
            <p className="text-xs text-muted-foreground">Items awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Finished Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finishedProductsCount}</div>
            <p className="text-xs text-muted-foreground">Ready for sale</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Inventory Filters</CardTitle>
              <CardDescription>Filter inventory by product type, animal, or stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Select value={selectedProductType} onValueChange={setSelectedProductType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Product Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypesOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "all" ? "All Product Types" : type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={selectedAnimalType} onValueChange={setSelectedAnimalType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Animals" />
                    </SelectTrigger>
                    <SelectContent>
                      {animalTypesOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "all" ? "All Animals" : type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      {serviceStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory</CardTitle>
              <CardDescription>All items currently in stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Product Type
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg. Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item: EnrichedInventoryItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{(item.product_type ?? '').replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{item.animal_type ?? ''}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(item.service_category)}`}
                        >
                          {item.service_category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">Ksh{item.average_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">Ksh{(item.quantity * item.average_cost).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(item.last_updated).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}