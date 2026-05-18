"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Search, 
  ArrowLeft,
  Check, 
  Loader2, 
  AlertCircle,
  PackageCheck,
  PackageOpen,
  DollarSign,
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomers, useFinishedStock, useProducts } from '@/hooks/useResource';
import { api } from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Product, FinishedStock } from "@/types";
import { Separator } from "@/components/ui/separator";

interface OrderItemDisplay {
  id: string; // Client-side unique ID
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productType: string;
  animalType: string;
  sizeCategory: string;
}

interface RecentItem {
  productId: number;
  productType: string;
  animalType: string;
  sizeCategory: string;
}

const RECENT_ORDER_ITEMS_KEY = "recent-order-items-cache";

// Premium category badge colors
const getProductBadgeColor = (type: string) => {
  switch (type.toUpperCase()) {
    case "SITTING_ANIMAL":
    case "SITTING ANIMAL":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "STANDING_ANIMAL":
    case "STANDING ANIMAL":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    default:
      return "bg-purple-50 text-purple-700 border-purple-200"
  }
};

export default function CreateOrderPage() {
  const router = useRouter()
  const { data: customers, loading: customersLoading, error: customersError } = useCustomers();
  const { data: products, loading: productsLoading, error: productsError } = useProducts();
  const { data: finishedStock } = useFinishedStock();

  const [customerId, setCustomerId] = useState("")
  const [notes, setNotes] = useState("")
  const [orderItems, setOrderItems] = useState<OrderItemDisplay[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [currentItem, setCurrentItem] = useState({
    productId: "",
    quantity: 1,
  })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem(RECENT_ORDER_ITEMS_KEY);
    if (cached) setRecentItems(JSON.parse(cached));
  }, []);

  const safeCustomers = customers || [];
  const safeProducts = (products as any)?.results || (Array.isArray(products) ? products : []);
  const safeFinishedStock = finishedStock || [];

  const stockMap = new Map<number, number>();
  safeFinishedStock.forEach((item: FinishedStock) => {
    if (item.product && typeof item.product === 'object') {
      stockMap.set(item.product.id, item.quantity);
    }
  });

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    // If the input exactly matches an item we already selected, don't show list
    if (currentItem.productId) {
      const selected = safeProducts.find((p: Product) => p.id.toString() === currentItem.productId);
      if (selected && productSearch === `${selected.product_type.replace(/_/g, " ")} - ${selected.animal_type} (${selected.size_category})`) {
        return [];
      }
    }
    const search = productSearch.toLowerCase();
    return safeProducts.filter((p: Product) =>
      p.product_type.toLowerCase().includes(search) ||
      p.animal_type.toLowerCase().includes(search) ||
      p.size_category.toLowerCase().includes(search)
    ).slice(0, 5); // Limit suggestions for clean presentation
  }, [safeProducts, productSearch, currentItem.productId]);

  const addOrderItem = () => {
    if (currentItem.productId) {
      const product = safeProducts.find((p: Product) => p.id.toString() === currentItem.productId)
      if (product) {
        // Prevent duplicate items, just combine quantity
        const existingIndex = orderItems.findIndex(item => item.productId === product.id);
        const unitPrice = Number(product.base_price || 0)

        if (existingIndex > -1) {
          const updatedItems = [...orderItems];
          updatedItems[existingIndex].quantity += currentItem.quantity;
          updatedItems[existingIndex].subtotal = updatedItems[existingIndex].quantity * unitPrice;
          setOrderItems(updatedItems);
        } else {
          const newItem: OrderItemDisplay = {
            id: Date.now().toString(),
            productId: product.id,
            quantity: currentItem.quantity,
            unitPrice: unitPrice,
            subtotal: unitPrice * currentItem.quantity,
            productType: product.product_type,
            animalType: product.animal_type,
            sizeCategory: product.size_category,
          }
          setOrderItems([...orderItems, newItem])
        }

        // Update Recent Items
        const newRecent: RecentItem = {
          productId: product.id,
          productType: product.product_type,
          animalType: product.animal_type,
          sizeCategory: product.size_category
        };
        const updatedRecent = [newRecent, ...recentItems.filter(r => r.productId !== product.id)].slice(0, 5);
        setRecentItems(updatedRecent);
        localStorage.setItem(RECENT_ORDER_ITEMS_KEY, JSON.stringify(updatedRecent));

        setCurrentItem({ productId: "", quantity: 1 })
        setProductSearch("")
      }
    }
  }

  const removeOrderItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id))
  }

  const getCustomerName = (id: string) => {
    return safeCustomers.find((c) => c.id.toString() === id)?.name || "Unknown";
  }

  const totalOrderValue = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleSubmit = async () => {
    if (orderItems.length === 0 || !customerId) {
      setFormError("Please add at least one product and select a customer first.");
      return;
    }

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    const orderItemsPayload: any[] = orderItems.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
    }));

    const payload: any = {
      customer: parseInt(customerId),
      notes: notes || undefined,
      items: orderItemsPayload,
    };

    try {
      await api.orders.create(payload);
      setFormSuccess("Order processed and logged successfully!");
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to create order. Please verify details.");
      setSubmitting(false)
    }
  }

  const selectedProduct = currentItem.productId
    ? safeProducts.find((p: Product) => p.id.toString() === currentItem.productId)
    : null

  const currentStock = selectedProduct ? (stockMap.get(selectedProduct.id) || 0) : 0;

  if (customersLoading || productsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardHeader className="pb-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
          <div><Card><CardHeader className="pb-3"><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 transition-colors -ml-3 mb-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Create New Order</h1>
          <p className="text-sm font-semibold text-muted-foreground">Log a brand new customer order and verify available finished stock</p>
        </div>
      </div>

      {formError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {formSuccess && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Order Placed!</AlertTitle>
          <AlertDescription>{formSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Profile box */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Customer Details
              </CardTitle>
              <CardDescription className="text-xs font-semibold">Select the customer purchasing the products</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Select Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="bg-white border-gray-300 font-medium text-sm h-11">
                    <SelectValue placeholder="Search and select customer profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {safeCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()} className="text-sm font-medium">
                        {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Recent Items (Quick Action) */}
          {recentItems.length > 0 && (
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b py-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  Recently Processed Items
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-wrap gap-2.5">
                {recentItems.map((item) => (
                  <Button
                    key={item.productId}
                    variant="outline"
                    size="sm"
                    className={`h-9 font-bold text-[11px] uppercase border px-3 transition-all hover:scale-[1.02] ${getProductBadgeColor(item.productType)}`}
                    onClick={() => {
                      const p = safeProducts.find((prod: Product) => prod.id === item.productId);
                      if (p) {
                        setCurrentItem({ ...currentItem, productId: p.id.toString() });
                        setProductSearch(`${p.product_type.replace(/_/g, " ")} - ${p.animal_type} (${p.size_category})`);
                      }
                    }}
                  >
                    {item.productType.replace(/_/g, " ")} • {item.animalType}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Catalog search and addition */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Product Selection
              </CardTitle>
              <CardDescription className="text-xs font-semibold">Search catalog inventory and set order volumes</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Search Field */}
                <div className="md:col-span-2 space-y-2 relative">
                  <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Search Catalog *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Type animal name or product type..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        if (!e.target.value) setCurrentItem({ ...currentItem, productId: "" });
                      }}
                      className="pl-10 h-11 border-gray-300 font-medium text-sm"
                    />
                  </div>

                  {/* Suggestion list overlay */}
                  {productSearch && !currentItem.productId && filteredProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y">
                      {filteredProducts.map((p: Product) => {
                        const inStock = stockMap.get(p.id) || 0;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => {
                              setCurrentItem({ ...currentItem, productId: p.id.toString() });
                              setProductSearch(`${p.product_type.replace(/_/g, " ")} - ${p.animal_type} (${p.size_category})`);
                            }}
                          >
                            <div>
                              <p className="text-sm font-extrabold text-gray-900">{p.product_type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground font-semibold mt-0.5">{p.animal_type} • {p.size_category}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-gray-900">Ksh {Number(p.base_price || 0).toLocaleString()}</p>
                              <Badge variant="outline" className={`font-bold text-[9px] uppercase mt-0.5 border ${inStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {inStock > 0 ? `Stock: ${inStock} pcs` : 'Out of Stock'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quantity Field */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-11 border-gray-300 font-extrabold text-sm text-center"
                  />
                </div>
              </div>

              {/* Dynamic Selected item cost evaluation */}
              {selectedProduct && (
                <div className="p-4 bg-slate-50/70 rounded-xl border border-dashed border-gray-300 animate-in slide-in-from-top-3 duration-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Unit Rate</p>
                      <p className="text-base font-extrabold text-gray-900 mt-0.5">
                        Ksh {Number(selectedProduct.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Finished Stock</p>
                      <Badge variant="outline" className={`font-bold text-[10px] uppercase border mt-1.5 ${currentStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {currentStock > 0 ? `${currentStock} available` : 'None in stock'}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Line Subtotal</p>
                      <p className="text-2xl font-black text-blue-600 mt-0.5">
                        Ksh {(Number(selectedProduct.base_price || 0) * currentItem.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={addOrderItem}
                className="w-full h-11 text-xs font-bold uppercase tracking-wider"
                disabled={!currentItem.productId}
              >
                <Plus className="mr-2 h-4 w-4 stroke-[3]" />
                Add to Order List
              </Button>
            </CardContent>
          </Card>

          {/* Active selection cart */}
          {orderItems.length > 0 && (
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  Order List Items
                </CardTitle>
                <CardDescription className="text-xs font-semibold">Verify list item selections before finalizing order</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50/30 transition-colors group">
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border shadow-sm ${getProductBadgeColor(item.productType)}`}>
                          {item.quantity}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-extrabold text-gray-900 text-sm">{item.productType.replace(/_/g, " ")}</span>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase h-4.5">{item.sizeCategory}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold">
                            {item.animalType} • Ksh {Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} / unit
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-black text-sm text-gray-900">
                            Ksh {Number(item.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100" 
                          onClick={() => removeOrderItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sticky checkout sidebar */}
        <div className="space-y-8">
          <Card className="sticky top-6 border-2 border-indigo-200/60 shadow-lg shadow-indigo-100/50 bg-gradient-to-b from-white to-indigo-50/10 overflow-hidden">
            <CardHeader className="bg-indigo-50/30 border-b pb-4">
              <CardTitle className="text-base font-bold text-indigo-950 flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-indigo-600" />
                Checkout Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Recipient Customer:</span>
                  <span className="font-extrabold text-indigo-950">
                    {customerId ? getCustomerName(customerId) : "Profile Awaiting Selection"}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Total Item Volumes:</span>
                  <span className="font-extrabold text-indigo-950">{totalQuantity} pcs</span>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Internal Reference Notes</Label>
                  <Textarea
                    placeholder="Log details, PO reference, delivery notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px] bg-white border-gray-300 font-medium text-xs leading-relaxed"
                  />
                </div>
              </div>

              <Separator className="bg-indigo-100" />

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Total Value Due</div>
                  <div className="text-3xl font-black text-indigo-950 tracking-tight leading-none mt-1.5">
                    Ksh {Number(totalOrderValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <Badge className="bg-indigo-600 text-white font-extrabold text-[9px] uppercase px-2 py-0.5">
                  Locked
                </Badge>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full h-13 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
                disabled={orderItems.length === 0 || !customerId || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Order...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 stroke-[2.5]" />
                    Place Order
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}