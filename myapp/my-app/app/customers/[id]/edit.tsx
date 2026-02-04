"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, useParams } from "next/navigation";
import { api } from '@/lib/api';
import { Customer } from "@/types";
import { User, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchCustomer = async () => {
        setLoading(true);
        try {
          const data = await api.customers.get(parseInt(id));
          setCustomer(data);
        } catch (err) {
          setError("Failed to fetch customer data.");
        } finally {
          setLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!customer || !customer.name) {
      setError("Customer name is required.");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await api.customers.update(parseInt(id), customer);
      alert("Customer updated successfully!");
      router.push("/customers");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      alert(`Failed to update customer: ${errorMessage}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-8" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500">{error}</div>;
  }

  if (!customer) {
    return <div className="container mx-auto p-6">Customer not found.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Customer</h1>
        <p className="text-muted-foreground mt-2">Update the details for {customer.name}.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>Update the form below with the new customer details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={customer.email || ""}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              placeholder="e.g., john.doe@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={customer.phone || ""}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              placeholder="e.g., +1 415-555-2671"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={customer.address || ""}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              placeholder="e.g., 123 Main St, Anytown, USA"
              rows={3}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updating || !customer.name}>
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <User className="mr-2 h-4 w-4" />
              )}
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}