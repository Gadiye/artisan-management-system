"use client"; // <--- Add this line at the very top

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useFinishedStock } from '@/hooks/useResource';
import { FinishedStockItem } from "@/lib/api";

interface EnrichedFinishedStockItem extends FinishedStockItem {
  product: {
    id: number;
    product_type: string;
    animal_type: string;
    size_category: string;
    base_price: number;
    reorder_level: number;
    unit_of_measure: string; // Added this field
  };
}

function getStockStatusColor(status: string) {
  switch (status) {
    case "IN_STOCK":
      return "default"
    case "LOW_STOCK":
      return "secondary"
    case "OUT_OF_STOCK":
      return "destructive"
    default:
      return "secondary"
  }
}

function getStockStatusIcon(status: string) {
  switch (status) {
    case "IN_STOCK":
      return <Package className="h-4 w-4" />
    case "LOW_STOCK":
      return <TrendingDown className="h-4 w-4" />
    case "OUT_OF_STOCK":
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <Package className="h-4 w-4" />
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
  const lowStockItems = safeFinishedStock.filter((item: EnrichedFinishedStockItem) => item.quantity <= item.product.reorder_level && item.quantity > 0).length;
  const outOfStockItems = safeFinishedStock.filter((item: EnrichedFinishedStockItem) => item.quantity === 0).length;


  if (loading) {
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Finished Stock Overview</h1>
        <p className="text-muted-foreground mt-2">Current inventory of finished products</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Unique items in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity} units</div>
            <p className="text-xs text-muted-foreground">Combined units across all products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Based on average cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastUpdated}</div>
            <p className="text-xs text-muted-foreground">Most recent inventory change</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {(lowStockItems > 0 || outOfStockItems > 0) && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Stock Alerts
            </CardTitle>
            <CardDescription className="text-yellow-700">Items that need attention for restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {safeFinishedStock
                .filter((item) => item.quantity <= item.product.reorder_level || item.quantity === 0)
                .map((item) => {
                  let status = "IN_STOCK";
                  if (item.quantity === 0) {
                    status = "OUT_OF_STOCK";
                  } else if (item.quantity <= item.product.reorder_level) {
                    status = "LOW_STOCK";
                  }
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{(item.product.product_type ?? '').replace(/_/g, " ")}</Badge>
                        <span className="text-sm">
                          {item.product.animal_type} ({item.product.size_category.replace(/_/g, " ")})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {item.quantity} / {item.product.reorder_level} minimum
                        </span>
                        <Badge variant={getStockStatusColor(status)}>{status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Finished Stock Inventory</CardTitle>
          <CardDescription>All finished products available for customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeFinishedStock.map((item) => {
                const margin = ((Number(item.product.base_price || 0) - Number(item.average_cost || 0)) / Number(item.product.base_price || 0)) * 100;
                let status = "IN_STOCK";
                if (item.quantity === 0) {
                  status = "OUT_OF_STOCK";
                } else if (item.quantity <= item.product.reorder_level) {
                  status = "LOW_STOCK";
                }
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.product.product_type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{item.product.animal_type ?? ''}</TableCell>
                    <TableCell>{(item.product.size_category ?? '').replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.product.unit_of_measure === 'PAIRS' ? 
                        (() => {
                          const pairs = Math.floor(item.quantity / 2);
                          const singles = item.quantity % 2;
                          return `${pairs} pairs, ${singles} singles (${item.quantity} individual items)`;
                        })()
                        : 
                        <>{item.quantity} items</>
                      }
                      {item.quantity <= item.product.reorder_level && item.quantity > 0 && (
                        <span className="text-yellow-600 ml-1">⚠</span>
                      )}
                    </TableCell>
                    <TableCell>${Number(item.average_cost || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(item.product.base_price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {margin > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={margin > 0 ? "text-green-600" : "text-red-600"}>{margin.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStockStatusColor(status)} className="flex items-center gap-1 w-fit">
                        {getStockStatusIcon(status)}
                        {status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.last_updated).toLocaleDateString()}
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