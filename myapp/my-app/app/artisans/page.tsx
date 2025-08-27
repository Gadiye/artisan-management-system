"use client"; // This directive is crucial for using hooks like useState and useEffect

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Edit, Phone, Calendar, DollarSign, Briefcase, Star } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

// Import the useArtisans hook from your hooks file
import { useArtisans } from '@/hooks/useResource';
import { api, Artisan } from '@/lib/api'; // Assuming your types are exported from lib/api/index.ts

type NewArtisan = Omit<Artisan, 'id'>;

export default function ArtisansPage() {
  // Use the useArtisans hook to fetch data
  // The 'data' returned by useArtisans will be Artisan[] | null
  const { data: artisans, loading, error, refetch } = useArtisans();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newArtisan, setNewArtisan] = useState<Partial<NewArtisan>>({
    name: "",
    phone: "",
    specialties: [],
    is_active: true,
    created_date: new Date().toISOString(),
  });
  const [submitting, setSubmitting] = useState(false);

  // Calculate statistics based on fetched artisans
  // Ensure 'artisans' is treated as an array for calculations
  const safeArtisans = artisans?.results || (Array.isArray(artisans) ? artisans : []);

  const activeArtisans = safeArtisans.filter((a) => a.is_active).length;
  const totalEarnings = safeArtisans.reduce((sum, a) => sum + (a.total_earnings || 0), 0);
  const totalPendingPayments = safeArtisans.reduce((sum, a) => sum + (a.pending_payment || 0), 0);
  const averageRating = safeArtisans.length ?
    safeArtisans.reduce((sum, a) => sum + (a.average_rating || 0), 0) / safeArtisans.length : 0;

  async function handleAddArtisan() {
    setSubmitting(true);
    try {
      await api.artisans.create(newArtisan as NewArtisan);
      setShowAddDialog(false);
      setNewArtisan({ name: "", phone: "", specialties: [], is_active: true, created_date: new Date().toISOString() });
      refetch();
    } catch (err) {
      console.error("Failed to create artisan:", err);
      alert(`Error: ${(err as Error).message || "An unexpected error occurred."}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refetch} className="mt-4">Retry</Button> {/* Add a retry button */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Artisan Management</h1>
            <p className="text-muted-foreground mt-2">A list of all artisans in your system.</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Artisan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Artisan</DialogTitle>
                <DialogDescription>Enter the artisan&apos;s information below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newArtisan.name}
                    onChange={(e) => setNewArtisan({ ...newArtisan, name: e.target.value })}
                    placeholder="Artisan name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newArtisan.phone}
                    onChange={(e) => setNewArtisan({ ...newArtisan, phone: e.target.value })}
                    placeholder="+254712345678"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddArtisan} disabled={!newArtisan.name || submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Artisan
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Artisans Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Artisans</CardTitle>
          <CardDescription>Complete list of craftspeople</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artisan</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeArtisans.map((artisan: Artisan) => (
                <TableRow key={artisan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{artisan.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        Joined {new Date(artisan.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Phone className="h-3 w-3 mr-1" />
                      {artisan.phone || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={artisan.is_active ? "default" : "secondary"}>
                      {artisan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/artisans/${artisan.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/artisans/${artisan.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}