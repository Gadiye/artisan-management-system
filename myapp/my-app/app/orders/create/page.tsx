"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCustomers, useFinishedStock } from '@/hooks/useResource';
import { api, OrderItem as ApiOrderItem, Order as ApiOrder } from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Product } from "@/types";

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

export default function CreateOrderPage() {
  const router = useRouter()
  const { data: customers, loading: customersLoading, error: customersError } = useCustomers();
  const { data: finishedStock, loading: finishedStockLoading, error: finishedStockError } = useFinishedStock();

  const [customerId, setCustomerId] = useState("")
  const [notes, setNotes] = useState("")
  const [orderItems, setOrderItems] = useState<OrderItemDisplay[]>([])
  const [currentItem, setCurrentItem] = useState({
    productId: "",
    quantity: 1,
  })

  const safeCustomers = customers || [];
  const safeFinishedStock = finishedStock || [];

  // Filter for stock items where product information is fully loaded (is an object)
  const validStock = safeFinishedStock.filter((item): item is typeof item & { product: Product } =>
    typeof item.product === 'object' && item.product !== null
  );

  const addOrderItem = () => {
    if (currentItem.productId) {
      const product = validStock.find((p) => p.product.id.toString() === currentItem.productId)
      if (product && currentItem.quantity <= product.quantity) {
        const newItem: OrderItemDisplay = {
          id: Date.now().toString(),
          productId: product.product.id,
          quantity: currentItem.quantity,
          unitPrice: product.product.base_price,
          subtotal: product.product.base_price * currentItem.quantity,
          productType: product.product.product_type,
          animalType: product.product.animal_type,
          sizeCategory: product.product.size_category,
        }

        setOrderItems([...orderItems, newItem])
        setCurrentItem({ productId: "", quantity: 1 })
      } else if (product) {
        alert(`Not enough stock for ${product.product.product_type.replace(/_/g, " ")} - ${product.product.animal_type}. Available: ${product.quantity}`);
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

    const orderItemsPayload: ApiOrderItem[] = orderItems.map(item => ({
      product: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    })) as ApiOrderItem[]; // Cast to ApiOrderItem[]

    const payload: Partial<ApiOrder> = {
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
    ? validStock.find((p) => p.product.id.toString() === currentItem.productId)
    : null

  if (customersLoading || finishedStockLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
          {[...Array(3)].map((_, i) => (
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

  if (customersError || finishedStockError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{customersError instanceof Error ? customersError.message : finishedStockError instanceof Error ? finishedStockError.message : "An unknown error occurred."}</AlertDescription>
        </Alert>
        <Button onClick={() => { /* refetchCustomers(); refetchFinishedStock(); */ }} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground mt-2">Create a new customer order from finished stock</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Setup */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Set up the basic order information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {safeCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes for this order..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
              <CardDescription>Add finished products to the order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="product">Product</Label>
                  <Select
                    value={currentItem.productId}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, productId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {validStock.map((stockItem) => (
                        <SelectItem key={stockItem.id} value={stockItem.product.id.toString()}>
                          {stockItem.product.product_type.replace(/_/g, " ")} - {stockItem.product.animal_type} ({stockItem.product.size_category.replace(/_/g, " ")}) - $
                          {stockItem.product.base_price} (Stock: {stockItem.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedProduct?.quantity || 1}
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: Number.parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Unit Price:</span> ${selectedProduct.product.base_price.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Available Stock:</span> {selectedProduct.quantity}
                    </div>
                    <div>
                      <span className="font-medium">Subtotal:</span> $
                      {(selectedProduct.product.base_price * currentItem.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={addOrderItem} disabled={!currentItem.productId || !selectedProduct || currentItem.quantity <= 0 || currentItem.quantity > (selectedProduct?.quantity || 0)}>
                <Plus className="mr-2 h-4 w-4" />
                Add to Order
              </Button>
            </CardContent>
          </Card>

          {/* Order Items List */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({orderItems.length})</CardTitle>
                <CardDescription>Products in this order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{item.productType.replace(/_/g, " ")}</Badge>
                          <Badge variant="secondary">{item.animalType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.sizeCategory.replace(/_/g, " ")} • Qty: {item.quantity} • ${item.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeOrderItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Review before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Customer</Label>
                <p className="text-sm text-muted-foreground">
                  {customerId ? getCustomerName(customerId) : "Not selected"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Total Items</Label>
                <p className="text-sm text-muted-foreground">
                  {orderItems.reduce((sum, item) => sum + item.quantity, 0)} pieces
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Product Types</Label>
                <p className="text-sm text-muted-foreground">
                  {new Set(orderItems.map((item) => item.productType)).size} different
                  products
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Total Order Value</Label>
                  <span className="text-lg font-bold">${totalOrderValue.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={orderItems.length === 0 || !customerId}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}