"use client"

import { useApi } from "@/hooks/useApi"
import { apiRequest } from "@/lib/api"
import type { Order, OrderItem } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard,
  Notebook
} from "lucide-react"
import Link from "next/link"
import React, { useState } from "react"

interface OrderDetailPageProps {
  params: Promise<{
    id: string
  }>
}

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return <Clock className="h-4 w-4" />
    case "PROCESSING":
      return <Package className="h-4 w-4" />
    case "SHIPPED":
      return <Truck className="h-4 w-4" />
    case "DELIVERED":
      return <CheckCircle className="h-4 w-4" />
    case "CANCELLED":
      return <XCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
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

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const unwrappedParams = React.use(params)
  const orderId = unwrappedParams.id

  const { data: order, loading, error, refetch } = useApi<Order>(`/orders/${orderId}/`)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    setUpdateError(null)
    try {
      await apiRequest(`/orders/${orderId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      await refetch()
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update order status.")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <Link href="/orders">
            <Button variant="ghost" className="hover:bg-gray-100 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Error Loading Order</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <Link href="/orders">
            <Button variant="ghost" className="hover:bg-gray-100 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
        <Alert variant="default">
          <AlertTitle>Order Not Found</AlertTitle>
          <AlertDescription>The order with ID {orderId} could not be found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const items = order.items || []

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Status controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-3">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 transition-colors -ml-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Order #{order.order_id}
            </h1>
            <Badge variant="outline" className={`font-bold text-xs uppercase px-2.5 py-1 border ${getStatusColor(order.status)}`}>
              <span className="flex items-center gap-1.5">
                {getStatusIcon(order.status)}
                {order.status}
              </span>
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Placed on {new Date(order.created_date).toLocaleString()}
          </div>
        </div>

        {/* Status Transition dropdown */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Update Status</span>
          <Select 
            value={order.status} 
            onValueChange={handleStatusChange}
            disabled={updating}
          >
            <SelectTrigger className="w-[160px] bg-gray-50 border-gray-300 text-xs font-bold uppercase">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING" className="text-xs font-bold uppercase text-amber-700">Pending</SelectItem>
              <SelectItem value="PROCESSING" className="text-xs font-bold uppercase text-blue-700">Processing</SelectItem>
              <SelectItem value="SHIPPED" className="text-xs font-bold uppercase text-indigo-700">Shipped</SelectItem>
              <SelectItem value="DELIVERED" className="text-xs font-bold uppercase text-emerald-700">Delivered</SelectItem>
              <SelectItem value="CANCELLED" className="text-xs font-bold uppercase text-rose-700">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {updateError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Update Failed</AlertTitle>
          <AlertDescription>{updateError}</AlertDescription>
        </Alert>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns - Order Items & Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Ordered Items
              </CardTitle>
              <CardDescription className="text-xs font-semibold">List of products in this order</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/30">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs pl-6">Product Details</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Quantity</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right">Unit Price</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-medium">
                        No items found in this order.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: OrderItem) => (
                      <TableRow key={item.id} className="hover:bg-gray-50/30 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <div className="font-bold text-gray-900 text-sm">
                            {(item.product?.product_type || "Product").replace(/_/g, " ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-0.5">
                            {item.product?.animal_type} • {(item.product?.size_category || "").replace(/_/g, " ")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-sm text-gray-900 py-4">
                          {item.quantity} pcs
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground font-medium py-4">
                          Ksh {Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-sm text-gray-900 pr-6 py-4">
                          Ksh {Number(item.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Notebook className="h-5 w-5 text-amber-600" />
                Order Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                {order.notes || "No special instructions or notes provided for this order."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer & Summary */}
        <div className="space-y-8">
          {/* Customer Card */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Customer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Customer Name</div>
                <div className="text-base font-extrabold text-gray-900 mt-0.5">
                  {order.customer?.name || "Unknown Customer"}
                </div>
              </div>

              {order.customer?.email && (
                <div className="flex items-center gap-2.5 pt-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-gray-700">{order.customer.email}</span>
                </div>
              )}

              {order.customer?.phone && (
                <div className="flex items-center gap-2.5 pt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-gray-700">{order.customer.phone}</span>
                </div>
              )}

              {order.customer?.address && (
                <div className="flex items-start gap-2.5 pt-2 border-t mt-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Delivery Address</div>
                    <div className="text-sm font-medium text-gray-700 mt-1 leading-relaxed">
                      {order.customer.address}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Summary Card */}
          <Card className="border-gray-200 shadow-sm overflow-hidden bg-gradient-to-b from-white to-gray-50/30">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground">
                <span>Items Subtotal</span>
                <span>Ksh {Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground">
                <span>Shipping & Handling</span>
                <span className="text-emerald-600">Free</span>
              </div>
              
              <div className="border-t pt-4 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Total Value</div>
                  <div className="text-2xl font-black text-gray-900 leading-none mt-1">
                    Ksh {Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <Badge variant="outline" className={`font-bold text-[10px] uppercase border px-2 py-0.5 ${getStatusColor(order.status)}`}>
                  Paid
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
