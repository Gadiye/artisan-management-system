"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Eye, Mail, Phone, MapPin, Users, TrendingUp, DollarSign, UserPlus } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useCustomers } from '@/hooks/useResource';

export default function CustomersPage() {
  const { data: customers, loading, error, refetch } = useCustomers();
  const [searchTerm, setSearchTerm] = useState("")

  const safeCustomers = useMemo(() => customers || [], [customers]);

  const filteredCustomers = useMemo(() => {
    return safeCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [safeCustomers, searchTerm]);

  const activeCustomers = useMemo(() => safeCustomers.filter((c) => c.is_active).length, [safeCustomers]);
  const totalRevenue = useMemo(() => safeCustomers.reduce((acc, c) => acc + Number(c.total_spent || 0), 0), [safeCustomers]);
  const avgOrderValue = totalRevenue / (safeCustomers.reduce((acc, c) => acc + (c.total_orders || 0), 0) || 1);
  const newCustomersThisMonth = useMemo(() => safeCustomers.filter(c => new Date(c.created_date) > new Date(new Date().setDate(1))).length, [safeCustomers]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center border-b pb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
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
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="h-8 w-8 text-blue-600" />
            Customer Management
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Manage your customer database, tracking relationships and ordering history
          </p>
        </div>
        <Link href="/customers/create">
          <Button className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Customer Statistics - Glassmorphic Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Users className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{safeCustomers.length}</div>
            <p className="text-xs text-blue-800/80 font-medium mt-1">{activeCustomers} active members</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
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
              Ksh {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-emerald-800/80 font-medium mt-1">Life-time value</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <TrendingUp className="h-16 w-16 text-purple-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              Avg. Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-purple-600 tracking-tight">
              Ksh {avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-purple-800/80 font-medium mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-orange-100 bg-gradient-to-br from-orange-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <UserPlus className="h-16 w-16 text-orange-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse"></span>
              New This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-600 tracking-tight">{newCustomersThisMonth}</div>
            <p className="text-xs text-orange-800/80 font-medium mt-1">Growth this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Search Database</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customers Table */}
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-bold text-gray-900">All Customers</CardTitle>
          <CardDescription className="text-xs">Complete customer database and ordering statistics</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/70">
              <TableRow>
                <TableHead className="font-bold text-gray-700 text-xs">Customer</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Contact Information</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Date Joined</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-medium">
                    No customers found matching your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{customer.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1 font-medium">
                          <MapPin className="h-3 w-3 mr-1 text-blue-600" />
                          {customer.address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-xs font-medium text-gray-600">
                            <Mail className="h-3 w-3 mr-1.5 text-blue-600" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-xs font-medium text-gray-600">
                            <Phone className="h-3 w-3 mr-1.5 text-blue-600" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 font-medium">
                      {new Date(customer.created_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={customer.is_active ? "default" : "secondary"}
                        className={customer.is_active 
                          ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-bold text-[10px] uppercase" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200 font-bold text-[10px] uppercase"
                        }
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/customers/${customer.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                        </Link>
                        <Link href={`/customers/${customer.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                        </Link>
                      </div>
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