"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useHierarchicalServiceRates, useProductsWithoutServiceRates } from '@/hooks/useResource'
import React, { useState, useMemo } from "react"

export default function PricingPage() {
  const { data: hierarchicalRates, loading, error } = useHierarchicalServiceRates();
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

  const serviceCategories = ["Carving", "Sanding", "Painting", "Cutting", "Finishing"];

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
        {/* The "Add New Rate" dialog is removed for now as it needs to be adapted to the new data structure. */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Service Rates</CardTitle>
          <CardDescription>Rates paid to artisans for each unit of work completed</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="border">Product Category</TableHead>
                <TableHead className="border">Animal</TableHead>
                <TableHead className="border">Size</TableHead>
                {serviceCategories.map(category => (
                  <TableHead key={category} className="border">{category} (Ksh)</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRates && filteredRates.length > 0 ? (
                filteredRates.map((group, groupIndex) => (
                  <React.Fragment key={groupIndex}>
                    {group.rates.map((rate, rateIndex) => (
                      <TableRow key={`${groupIndex}-${rateIndex}`}>
                        {rateIndex === 0 && (
                          <>
                            <TableCell rowSpan={group.rates.length} className="font-medium align-top border">
                              {group.product_category}
                            </TableCell>
                            <TableCell rowSpan={group.rates.length} className="font-medium align-top border">
                              {group.animal}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="border">{rate.size}</TableCell>
                        {serviceCategories.map(category => (
                          <TableCell key={category} className="border">
                            {rate[category] ? parseFloat(rate[category]).toFixed(2) : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={serviceCategories.length + 3} className="text-center py-8 text-muted-foreground">
                    No service rates found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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