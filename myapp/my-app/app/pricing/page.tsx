"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useServiceRates, useProducts } from '@/hooks/useResource'
import { api } from "@/lib/api"
import React, { useState, useMemo } from "react" // Added useState and useMemo

export default function PricingPage() {
  const { data: serviceRates, loading, error } = useServiceRates();
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // Changed initial state to "all"

  const uniqueCategories = useMemo(() => {
    if (!serviceRates) return [];
    const categories = new Set(serviceRates.map(rate => rate.service_category));
    return Array.from(categories).sort();
  }, [serviceRates]);

  const filteredServiceRates = useMemo(() => {
    if (!serviceRates) return [];
    return serviceRates.filter(rate => {
      const matchesProduct = productFilter === "" ||
        rate.product?.product_type?.toLowerCase().includes(productFilter.toLowerCase()) ||
        rate.product?.animal_type?.toLowerCase().includes(productFilter.toLowerCase());
      const matchesCategory = categoryFilter === "all" || // Changed logic to check for "all"
        rate.service_category === categoryFilter;
      return matchesProduct && matchesCategory;
    });
  }, [serviceRates, productFilter, categoryFilter]);

  const { data: products, loading: productsLoading, error: productsError } = useProducts(); // Added useProducts

  const [newRateData, setNewRateData] = useState({
    productId: null,
    serviceCategory: "",
    ratePerUnit: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // To control dialog open/close

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await api.serviceRates.create({
        product: newRateData.productId,
        service_category: newRateData.serviceCategory,
        rate_per_unit: newRateData.ratePerUnit,
      });
      setNewRateData({ productId: null, serviceCategory: "", ratePerUnit: 0 }); // Clear form
      refetch(); // Refresh data in the table
      setIsDialogOpen(false); // Close dialog
    } catch (err) {
      setFormError(err.message || "Failed to add service rate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
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
          <AlertDescription>{error instanceof Error ? error.message : "An unknown error occurred."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Service Rates</h1>
        <p className="text-muted-foreground mt-2">Fixed rates for artisan services per product type</p>
      </div>

      <div className="flex space-x-4 mb-6">
        <Input
          placeholder="Filter by Product..."
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select onValueChange={setCategoryFilter} value={categoryFilter}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Filter by Category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Rate</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Service Rate</DialogTitle>
              <DialogDescription>
                Fill in the details for the new service rate.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="product" className="text-right">
                  Product
                </Label>
                <Select onValueChange={(value) => setNewRateData({ ...newRateData, productId: parseInt(value) })} value={newRateData.productId?.toString() || ""}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsLoading ? (
                      <SelectItem value="" disabled>Loading products...</SelectItem>
                    ) : productsError ? (
                      <SelectItem value="" disabled>Error loading products</SelectItem>
                    ) : products && products.length > 0 ? (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.product_type} - {product.animal_type}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>No products found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="serviceCategory" className="text-right">
                  Service Category
                </Label>
                <Select onValueChange={(value) => setNewRateData({ ...newRateData, serviceCategory: value })} value={newRateData.serviceCategory}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ratePerUnit" className="text-right">
                  Rate Per Unit
                </Label>
                <Input
                  id="ratePerUnit"
                  type="number"
                  value={newRateData.ratePerUnit}
                  onChange={(e) => setNewRateData({ ...newRateData, ratePerUnit: parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              {formError && <p className="text-red-500 text-sm col-span-4">{formError}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Rate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Service Rates</CardTitle>
          <CardDescription>Rates paid to artisans for each unit of work completed</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Service Category</TableHead>
                <TableHead>Rate Per Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServiceRates && filteredServiceRates.length > 0 ? ( // Changed serviceRates to filteredServiceRates
                filteredServiceRates.map((rate) => ( // Changed serviceRates to filteredServiceRates
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {rate.product?.product_type} - {rate.product?.animal_type}
                    </TableCell>
                    <TableCell>{rate.service_category}</TableCell>
                    <TableCell>Ksh{(rate.rate_per_unit ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No service rates found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
