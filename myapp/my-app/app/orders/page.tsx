"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Package, Truck, CheckCircle, Clock, XCircle, ChevronRight, ShoppingBag, DollarSign, Activity } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useOrders } from '@/hooks/useResource';

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return <Clock className="h-3.5 w-3.5" />
    case "PROCESSING":
      return <Package className="h-3.5 w-3.5" />
    case "SHIPPED":
      return <Truck className="h-3.5 w-3.5" />
    case "DELIVERED":
      return <CheckCircle className="h-3.5 w-3.5" />
    case "CANCELLED":
      return <XCircle className="h-3.5 w-3.5" />
    default:
      return <Clock className="h-3.5 w-3.5" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "PROCESSING":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "SHIPPED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export default function OrdersPage() {
  const { data: orders, loading, error, refetch } = useOrders();

  const safeOrders = orders || [];

  const totalOrders = safeOrders.length;
  const pendingOrders = safeOrders.filter((order) => order.status === "PENDING").length;
  const processingOrders = safeOrders.filter((order) => order.status === "PROCESSING").length;
  const totalRevenue = safeOrders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-11 w-40" />
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
    const safeError = error as unknown;

    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {safeError instanceof Error ? safeError.message : "An unknown error occurred."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Order Management</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Track and manage customer orders seamlessly</p>
        </div>
        <Link href="/orders/create">
          <Button className="h-11 font-bold text-xs uppercase px-5 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Plus className="mr-2 h-4 w-4 stroke-[3]" />
            Create Order
          </Button>
        </Link>
      </div>

      {/* Order Statistics - Custom Premium Glassmorphism and Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <ShoppingBag className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tracking-tight">{totalOrders}</div>
            <p className="text-[10px] text-blue-800/80 font-bold mt-1">All time orders processed</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Clock className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">{pendingOrders}</div>
            <p className="text-[10px] text-amber-800/80 font-bold mt-1">Awaiting status updates</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Activity className="h-16 w-16 text-indigo-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">{processingOrders}</div>
            <p className="text-[10px] text-indigo-800/80 font-bold mt-1">Currently being packaged</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-800/80 font-bold mt-1">Excludes cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table - Custom Premium Styling */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">All Orders</CardTitle>
          <CardDescription className="text-xs font-semibold">Complete records of customer orders placed</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/30">
              <TableRow>
                <TableHead className="font-bold text-gray-700 text-xs pl-6">Order ID</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Customer</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Date</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Items</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Total Amount</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs pl-6">Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-center pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-medium">
                    No customer orders found in record.
                  </TableCell>
                </TableRow>
              ) : (
                safeOrders.map((order) => (
                  <TableRow key={order.order_id} className="hover:bg-gray-50/30 transition-colors group">
                    <TableCell className="font-bold text-gray-900 text-sm pl-6 py-4">
                      #{order.order_id}
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <div className="font-extrabold text-sm text-gray-900">{order.customer?.name || "Unknown"}</div>
                        <div className="text-[11px] text-muted-foreground font-medium truncate max-w-[180px]" title={order.notes}>
                          {order.notes || "No additional instructions"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-bold py-4">
                      {new Date(order.created_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-xs text-gray-900 py-4">
                      {(order.items?.length || 0)} items
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-sm text-gray-900 py-4">
                      Ksh {Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="pl-6 py-4">
                      <Badge variant="outline" className={`font-bold text-[10px] uppercase border px-2.5 py-0.5 w-fit ${getStatusColor(order.status)}`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center pr-6 py-4">
                      <Link href={`/orders/${order.order_id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full border border-gray-100 hover:bg-gray-100 hover:text-blue-600 transition-all flex items-center justify-center mx-auto"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}