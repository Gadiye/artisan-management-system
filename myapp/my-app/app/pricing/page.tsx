"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useHierarchicalServiceRates, useProductsWithoutServiceRates } from '@/hooks/useResource'
import { useApi } from "@/hooks/useApi";
import React, { useState, useMemo } from "react"
import { Search } from 'lucide-react';

const serviceCategories = ["Carving", "Sanding", "Painting", "Cutting", "Finishing"];

const AddServiceRateDialog = ({ refetchRates }) => {
  const { data: products } = useProductsWithoutServiceRates();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [ratePerUnit, setRatePerUnit] = useState("");
  const { post } = useApi("/service-rates/");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product =>
      `${product.product_type} ${product.animal_type} ${product.size_category}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const selectedProductData = useMemo(() => {
    if (!selectedProduct || !products) return null;
    return products.find(p => p.id === selectedProduct);
  }, [selectedProduct, products]);

  const handleSave = async () => {
    if (!selectedProduct || !selectedCategory || !ratePerUnit) return;

    const payload = {
      product: selectedProduct,
      service_category: selectedCategory,
      rate_per_unit: ratePerUnit
    };

    await post(payload);
    refetchRates();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-fit">Add New Rate</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">Add Service Rate</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Product:</Label>
              <div className="flex-1 border-b border-dashed border-muted-foreground/30"></div>
              <span className="text-xs text-muted-foreground">Change/Add View</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Product Selection */}
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{product.product_type}</span>
                        <span className="text-xs text-muted-foreground">
                          {product.animal_type} • {product.size_category}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-results" disabled>
                    No products found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Selected Product Display */}
            {selectedProductData && (
              <div className="p-3 bg-muted/50 rounded-md border">
                <div className="text-sm">
                  <span className="font-medium">{selectedProductData.product_type}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    - {selectedProductData.animal_type} - {selectedProductData.size_category}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Service Category Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Service category:</Label>
              <div className="flex-1 border-b border-dashed border-muted-foreground/30"></div>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select service category" />
              </SelectTrigger>
              <SelectContent>
                {serviceCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Rate Per Unit Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Rate per unit:</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">Ksh</span>
              <Input
                type="number"
                placeholder="0.00"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(e.target.value)}
                className="pl-8"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedProduct || !selectedCategory || !ratePerUnit}
            className="flex-1"
          >
            Save Rate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
};

const ServiceRatesTable = ({ filteredRates }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Service Rates</CardTitle>
        <CardDescription>Rates paid to artisans for each unit of work completed</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative border rounded-md">
          <div className="h-[600px] overflow-hidden flex flex-col">
            {/* Fixed header */}
            <div className="flex-shrink-0 border-b bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40 border-r bg-background">Product Category</TableHead>
                    <TableHead className="w-32 border-r bg-background">Animal</TableHead>
                    <TableHead className="w-24 border-r bg-background">Size</TableHead>
                    {serviceCategories.map((category) => (
                      <TableHead key={category} className="w-32 border-r bg-background">
                        {category} (Ksh)
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableBody>
                  {filteredRates && filteredRates.length > 0 ? (
                    filteredRates.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        {group.rates.map((rate, rateIndex) => (
                          <TableRow key={`${groupIndex}-${rateIndex}`} className="hover:bg-muted/50">
                            {rateIndex === 0 && (
                              <>
                                <TableCell rowSpan={group.rates.length} className="w-40 font-medium align-top border-r">
                                  {group.product_category}
                                </TableCell>
                                <TableCell rowSpan={group.rates.length} className="w-32 font-medium align-top border-r">
                                  {group.animal}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="w-24 border-r">{rate.size}</TableCell>
                            {serviceCategories.map((category) => (
                              <TableCell key={category} className="w-32 border-r">
                                {rate[category] ? Number.parseFloat(rate[category]).toFixed(2) : "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={serviceCategories.length + 3}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No service rates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export default function PricingPage() {
  const { data: hierarchicalRates, loading, error, refetch: refetchRates } = useHierarchicalServiceRates();
  const { data: productsWithoutRates, loading: loadingProductsWithoutRates, error: errorProductsWithoutRates } = useProductsWithoutServiceRates();
  const [productFilter, setProductFilter] = useState("");
  const [missingRatesFilter, setMissingRatesFilter] = useState("");

  const filteredRates = useMemo(() => {
    if (!hierarchicalRates) return [];
    if (!productFilter) return hierarchicalRates;
    return hierarchicalRates.filter(rate =>
      rate.product_category.toLowerCase().includes(productFilter.toLowerCase()) ||
      rate.animal.toLowerCase().includes(productFilter.toLowerCase())
    );
  }, [hierarchicalRates, productFilter]);

  const filteredMissingRates = useMemo(() => {
    if (!productsWithoutRates) return [];
    if (!missingRatesFilter) return productsWithoutRates;
    return productsWithoutRates.filter(product =>
      product.product_type.toLowerCase().includes(missingRatesFilter.toLowerCase()) ||
      product.animal_type.toLowerCase().includes(missingRatesFilter.toLowerCase()) ||
      product.size_category.toLowerCase().includes(missingRatesFilter.toLowerCase())
    );
  }, [productsWithoutRates, missingRatesFilter]);

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
          placeholder="Filter by Product or Animal..."
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="max-w-sm"
        />
        <AddServiceRateDialog refetchRates={refetchRates} />
      </div>

      <ServiceRatesTable filteredRates={filteredRates} />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Products Without Service Rates</CardTitle>
          <CardDescription>These products do not have any service rates defined.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <Input
              placeholder="Filter by Product, Animal, or Size..."
              value={missingRatesFilter}
              onChange={(e) => setMissingRatesFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Type</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProductsWithoutRates ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : errorProductsWithoutRates ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-red-500">
                    Error loading products.
                  </TableCell>
                </TableRow>
              ) : filteredMissingRates && filteredMissingRates.length > 0 ? (
                Object.values(filteredMissingRates.reduce((acc, product) => {
                  if (!acc[product.product_type]) {
                    acc[product.product_type] = [];
                  }
                  acc[product.product_type].push(product);
                  return acc;
                }, {} as Record<string, typeof filteredMissingRates>)).map((products, groupIndex) => (
                  <React.Fragment key={groupIndex}>
                    {products.map((product, productIndex) => (
                      <TableRow key={product.id}>
                        {productIndex === 0 && (
                          <TableCell rowSpan={products.length} className="font-medium align-top">
                            {product.product_type}
                          </TableCell>
                        )}
                        <TableCell>{product.animal_type}</TableCell>
                        <TableCell>{product.size_category}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    All products have service rates.
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
