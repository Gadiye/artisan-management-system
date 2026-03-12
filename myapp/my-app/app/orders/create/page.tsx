"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingCart, Search, Calculator, Check, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCustomers, useFinishedStock, useProducts } from '@/hooks/useResource';
import { api, OrderItem as ApiOrderItem, Order as ApiOrder } from '@/lib/api';
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

// Helper for item category colors
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
  ];
  return colorCombos[Math.abs(hash) % colorCombos.length];
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
    if (!productSearch) return safeProducts;
    const search = productSearch.toLowerCase();
    return safeProducts.filter((p: Product) =>
      p.product_type.toLowerCase().includes(search) ||
      p.animal_type.toLowerCase().includes(search) ||
      p.size_category.toLowerCase().includes(search)
    );
  }, [safeProducts, productSearch]);

  const addOrderItem = () => {
    if (currentItem.productId) {
      const product = safeProducts.find((p: Product) => p.id.toString() === currentItem.productId)
      if (product) {
        const unitPrice = Number(product.base_price || 0)
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

        // Update Recent Items
        const newRecent: RecentItem = {
          productId: product.id,
          productType: product.product_type,
          animalType: product.animal_type,
          sizeCategory: product.size_category
        };
        const updatedRecent = [newRecent, ...recentItems.filter(r => r.productId !== product.id)].slice(0, 10);
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

  const handleSubmit = async () => {
    if (orderItems.length === 0 || !customerId) {
      alert("Please add at least one product and select a customer.");
      return;
    }

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
      alert("Order created successfully!");
      router.push("/orders");
    } catch (err: unknown) {
      alert(`Failed to create order: ${(err as Error).message}`);
    }
  }

  const selectedProduct = currentItem.productId
    ? safeProducts.find((p: Product) => p.id.toString() === currentItem.productId)
    : null

  const currentStock = selectedProduct ? (stockMap.get(selectedProduct.id) || 0) : 0;

  if (customersLoading || productsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
          <div><Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground mt-2">Process customer orders and manage pre-orders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Header */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Selection</CardTitle>
              <CardDescription>Select customer and add order notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order Notes</Label>
                  <Input
                    placeholder="Reference, shipping info, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Items (Quick Action) */}
          {recentItems.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Recently Ordered</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {recentItems.map((item) => (
                  <Button
                    key={item.productId}
                    variant="outline"
                    size="sm"
                    className={getColorForString(item.productType)}
                    onClick={() => setCurrentItem({ ...currentItem, productId: item.productId.toString() })}
                  >
                    {item.productType.replace(/_/g, " ")} / {item.animalType}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
              <CardDescription>Search catalog and set quantities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label>Search & Select Product *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Type to find product..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          if (!e.target.value) setCurrentItem({ ...currentItem, productId: "" });
                        }}
                        className="pl-10"
                      />
                    </div>

                    {/* Suggestion List - Appears as you type */}
                    {productSearch && !currentItem.productId && filteredProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredProducts.map((p: Product) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-0"
                            onClick={() => {
                              setCurrentItem({ ...currentItem, productId: p.id.toString() });
                              setProductSearch(`${p.product_type.replace(/_/g, " ")} - ${p.animal_type} (${p.size_category})`);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">{p.product_type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">{p.animal_type} • {p.size_category}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">Ksh{p.base_price}</p>
                              <p className={`text-[10px] ${stockMap.get(p.id) ? 'text-green-600' : 'text-amber-600'}`}>
                                Stock: {stockMap.get(p.id) || 0}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {selectedProduct && (
                  <div className="p-4 bg-muted/50 rounded-xl border border-dashed">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Unit Price</p>
                        <p className="text-lg font-semibold">Ksh{Number(selectedProduct.base_price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">In Stock</p>
                        <p className={`text-lg font-semibold ${currentStock === 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {currentStock} units
                        </p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Item Subtotal</p>
                        <p className="text-2xl font-black text-primary">
                          Ksh{(Number(selectedProduct.base_price || 0) * currentItem.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={addOrderItem}
                  className="w-full h-12 text-lg"
                  disabled={!currentItem.productId}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add to Order List
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getColorForString(item.productType)}`}>
                          {item.quantity}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold">{item.productType.replace(/_/g, " ")}</span>
                            <Badge variant="outline" className="text-[10px] h-4">{item.sizeCategory}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.animalType} • Ksh{Number(item.unitPrice || 0).toFixed(2)} / unit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-black">Ksh{Number(item.subtotal || 0).toFixed(2)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeOrderItem(item.id)}>
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

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-bold">{customerId ? getCustomerName(customerId) : "None"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-bold">{orderItems.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-end pt-2">
                <span className="text-sm font-medium">Grand Total</span>
                <span className="text-3xl font-black text-primary">Ksh{Number(totalOrderValue || 0).toFixed(2)}</span>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full h-14 text-xl font-bold shadow-lg shadow-primary/20"
                disabled={orderItems.length === 0 || !customerId}
              >
                <ShoppingCart className="mr-3 h-6 w-6" />
                Place Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}