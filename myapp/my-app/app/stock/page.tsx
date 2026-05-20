"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingUp, TrendingDown, AlertTriangle, Boxes, DollarSign, Clock, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useFinishedStock } from '@/hooks/useResource';
import { FinishedStock, Product } from "@/types";
import { splitPairsAndItems } from "@/lib/utils";

interface EnrichedFinishedStockItem extends FinishedStock {
  product: Product & { unit_of_measure?: string };
}

function getStockStatusColor(status: string) {
  switch (status) {
    case "IN_STOCK":
      return "bg-green-100 text-green-800 border-green-200"
    case "LOW_STOCK":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "OUT_OF_STOCK":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

function getStockStatusIcon(status: string) {
  switch (status) {
    case "IN_STOCK":
      return <Package className="h-3.5 w-3.5" />
    case "LOW_STOCK":
      return <TrendingDown className="h-3.5 w-3.5" />
    case "OUT_OF_STOCK":
      return <AlertTriangle className="h-3.5 w-3.5" />
    default:
      return <Package className="h-3.5 w-3.5" />
  }
}

export default function FinishedStockPage() {
  const { data: finishedStock, loading, error, refetch } = useFinishedStock();

  // Ensure finishedStock is an array for calculations, even if null/undefined initially
  const safeFinishedStock = Array.isArray(finishedStock) ? finishedStock : [];

  // Calculate statistics
  const totalProducts = safeFinishedStock.length;
  const totalQuantity = safeFinishedStock.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = safeFinishedStock.reduce((sum, item) => sum + (item.quantity * Number(item.average_cost || 0)), 0);
  const lastUpdated = safeFinishedStock.length > 0 ? new Date(Math.max(...safeFinishedStock.map(item => new Date(item.last_updated).getTime()))).toLocaleDateString() : 'N/A';

  // Filter for low and out of stock items
  const lowStockItems = safeFinishedStock.filter((item): item is EnrichedFinishedStockItem => {
    const product = item.product;
    return typeof product === 'object' && product !== null && 'reorder_level' in product && item.quantity <= (product.reorder_level || 0) && item.quantity > 0;
  }).length;

  const outOfStockItems = safeFinishedStock.filter((item): item is EnrichedFinishedStockItem => item.quantity === 0).length;


  if (loading) {
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
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
            <Boxes className="h-8 w-8 text-blue-600" />
            Finished Stock Overview
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Monitor current inventory levels of finished woodcraft products ready for sale
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-150 px-3 py-1.5 rounded-full shadow-sm">
          <LayoutGrid className="h-3.5 w-3.5 text-blue-600" />
          <span>Warehouse Inventory System</span>
        </div>
      </div>

      {/* Statistics - Glassmorphic Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Package className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{totalProducts}</div>
            <p className="text-xs text-blue-800/80 font-medium mt-1">Unique products in stock</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Boxes className="h-16 w-16 text-purple-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-600 tracking-tight">{totalQuantity} Units</div>
            <p className="text-xs text-purple-800/80 font-medium mt-1">Combined warehouse volume</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-emerald-800/80 font-medium mt-1">Based on avg. production cost</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-orange-100 bg-gradient-to-br from-orange-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Clock className="h-16 w-16 text-orange-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse"></span>
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-orange-600 tracking-tight">{lastUpdated}</div>
            <p className="text-xs text-orange-800/80 font-medium mt-1">Latest warehouse movement</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts - Refined Style */}
      {(lowStockItems > 0 || outOfStockItems > 0) && (
        <Card className="border-red-100 bg-red-50/30 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-red-100 bg-red-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg font-bold text-red-900">Inventory Alerts</CardTitle>
            </div>
            <CardDescription className="text-xs font-medium text-red-800/70">Critical stock items requiring immediate reorder attention</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {safeFinishedStock
                .filter((item): item is EnrichedFinishedStockItem => {
                  const product = item.product;
                  return typeof product === 'object' && product !== null && 'reorder_level' in product && (item.quantity <= (product.reorder_level || 0) || item.quantity === 0);
                })
                .map((item) => {
                  const product = item.product;
                  if (typeof product !== 'object' || product === null) return null;
                  let status = "IN_STOCK";
                  if (item.quantity === 0) {
                    status = "OUT_OF_STOCK";
                  } else if (item.quantity <= (product.reorder_level ?? 0)) {
                    status = "LOW_STOCK";
                  }
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-slate-50 border-none font-bold text-[9px] uppercase tracking-tight text-gray-700">
                          {(product?.product_type || '').replace(/_/g, " ")}
                        </Badge>
                        <p className="text-xs font-bold text-gray-900">
                          {product?.animal_type} ({(product?.size_category || '').replace(/_/g, " ")})
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-[10px] font-extrabold text-red-700">
                          {item.quantity} / {product?.reorder_level} MIN
                        </div>
                        <Badge className={`${getStockStatusColor(status)} font-bold text-[9px] uppercase border px-1.5`}>
                          {status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Table */}
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-bold text-gray-900">Warehouse Inventory</CardTitle>
          <CardDescription className="text-xs">Complete list of finished products and commercial margins</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/70">
              <TableRow>
                <TableHead className="font-bold text-gray-700 text-xs">Product Details</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Qty in Stock</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Production Cost</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Retail Price</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-center">Net Margin</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Stock Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Last Movement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeFinishedStock.map((item) => {
                const product = item.product;
                if (typeof product !== 'object' || product === null) return null;

                const basePrice = Number(product.base_price || 0);
                const avgCost = Number(item.average_cost || 0);
                const margin = basePrice > 0
                  ? ((basePrice - avgCost) / basePrice) * 100
                  : 0;

                let status = "IN_STOCK";
                if (item.quantity === 0) {
                  status = "OUT_OF_STOCK";
                } else if (product.reorder_level !== undefined && item.quantity <= product.reorder_level) {
                  status = "LOW_STOCK";
                }
                return (
                  <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 text-sm">{(product?.product_type || '').replace(/_/g, " ")}</div>
                        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                          {product?.animal_type} • {(product?.size_category ?? '').replace(/_/g, " ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-extrabold text-sm text-gray-900">
                        {product?.unit_of_measure === 'PAIRS' ?
                            (() => {
                                const { pairs, singles } = splitPairsAndItems(item.quantity);
                                return `${pairs}P / ${singles}S`;
                            })()
                            :
                            `${item.quantity} pcs`
                        }
                      </div>
                      <div className="text-[10px] text-muted-foreground font-bold">({item.quantity} total)</div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-gray-600">
                      Ksh {Number(item.average_cost || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-sm text-blue-700">
                      Ksh {Number(product?.base_price || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${margin > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {margin > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {margin.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStockStatusColor(status)} font-bold text-[10px] uppercase border px-2 py-0.5 flex items-center gap-1.5 w-fit`}>
                        {getStockStatusIcon(status)}
                        {status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-medium text-muted-foreground">
                      {new Date(item.last_updated).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}