"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, AlertCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";


import { useArtisans } from "@/hooks/useResource";
import { api } from "@/lib/api";
import { ArtisanAdvance } from "@/types";

interface CreateAdvancePayload {
  artisan: number;
  amount: number;
  reason?: string;
}

export default function AdvancesPage() {
  const { toast } = useToast();
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();

  const [advances, setAdvances] = useState<ArtisanAdvance[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(true);
  const [errorAdvances, setErrorAdvances] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAdvanceData, setNewAdvanceData] = useState<CreateAdvancePayload>({
    artisan: 0,
    amount: 0,
    reason: "",
  });
  const [isCreatingAdvance, setIsCreatingAdvance] = useState(false);
  const [createAdvanceError, setCreateAdvanceError] = useState<string | null>(null);

  const [isDeductDialogOpen, setIsDeductDialogOpen] = useState(false);
  const [selectedAdvanceToDeduct, setSelectedAdvanceToDeduct] = useState<ArtisanAdvance | null>(null);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [isDeducting, setIsDeducting] = useState(false);
  const [deductError, setDeductError] = useState<string | null>(null);

  const [selectedArtisanFilter, setSelectedArtisanFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Fetch advances function
  const fetchAdvances = useCallback(async () => {
    setLoadingAdvances(true);
    setErrorAdvances(null);
    try {
      const response = await api.financials.advances.list();
      setAdvances(response);
    } catch (err: unknown) {
      setErrorAdvances((err as Error).message || "Failed to fetch advances.");
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to fetch advances.",
        variant: "destructive",
      });
    } finally {
      setLoadingAdvances(false);
    }
  }, [toast]);

  // Fetch advances on mount
  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleCreateAdvance = async () => {
    if (!newAdvanceData.artisan || newAdvanceData.amount <= 0) {
      setCreateAdvanceError("Please select an artisan and enter a valid amount.");
      return;
    }

    setIsCreatingAdvance(true);
    setCreateAdvanceError(null);
    try {
      const createdAdvance = await api.financials.advances.create(newAdvanceData);
      // Refresh list to ensure consistency
      await fetchAdvances();
      toast({
        title: "Success",
        description: `Advance of Ksh${createdAdvance.amount} created for ${artisans?.find(a => a.id === createdAdvance.artisan)?.name}.`,
      });
      setIsCreateDialogOpen(false);
      setNewAdvanceData({ artisan: 0, amount: 0, reason: "" });
    } catch (err: unknown) {
      setCreateAdvanceError((err as Error).message || "Failed to create advance.");
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to create advance.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdvance(false);
    }
  };

  const handleOpenDeductDialog = (advance: ArtisanAdvance) => {
    setSelectedAdvanceToDeduct(advance);
    setDeductionAmount(Number(advance.balance) || 0); // Default to full balance, or 0 if NaN
    setDeductError(null);
    setIsDeductDialogOpen(true);
  };

  const handleDeductAdvance = async () => {
    if (!selectedAdvanceToDeduct || deductionAmount <= 0 || deductionAmount > Number(selectedAdvanceToDeduct.balance)) {
      setDeductError("Please enter a valid deduction amount, not exceeding the outstanding balance.");
      return;
    }

    setIsDeducting(true);
    setDeductError(null);
    try {
      await api.financials.advances.deduct(selectedAdvanceToDeduct.id, deductionAmount);
      // Refresh list to ensure consistency and correct balances
      await fetchAdvances();
      toast({
        title: "Success",
        description: `Ksh${deductionAmount} deducted from advance for ${artisans?.find(a => a.id === selectedAdvanceToDeduct.artisan)?.name}.`,
      });
      setIsDeductDialogOpen(false);
      setSelectedAdvanceToDeduct(null);
      setDeductionAmount(0);
    } catch (err: unknown) {
      setDeductError((err as Error).message || "Failed to deduct advance.");
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to deduct advance.",
        variant: "destructive",
      });
    } finally {
      setIsDeducting(false);
    }
  };

  const filteredAdvances = useMemo(() => {
    let filtered = advances;

    if (selectedArtisanFilter !== "all") {
      filtered = filtered.filter(
        (advance) => advance.artisan === Number(selectedArtisanFilter)
      );
    }

    if (selectedStatusFilter !== "all") {
      const isSettled = selectedStatusFilter === "settled";
      filtered = filtered.filter((advance) => advance.is_settled === isSettled);
    }

    return filtered;
  }, [advances, selectedArtisanFilter, selectedStatusFilter]);

  const totalOutstandingAdvances = useMemo(() => {
    return advances.reduce((sum, advance) => {
      const bal = Number(advance.balance);
      return sum + (advance.is_settled || isNaN(bal) ? 0 : bal);
    }, 0);
  }, [advances]);

  if (loadingAdvances || artisansLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-8">
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

  if (errorAdvances || artisansError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {errorAdvances || artisansError?.message || "An unknown error occurred."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Artisan Advances</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track advances given to artisans.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Give New Advance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{advances.reduce((sum, a) => sum + Number(a.amount), 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{advances.length} records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{totalOutstandingAdvances.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across {advances.filter(a => !a.is_settled).length} advances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Settled Advances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{advances.filter(a => a.is_settled).reduce((sum, a) => sum + Number(a.amount), 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{advances.filter(a => a.is_settled).length} records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Advances</CardTitle>
          <CardDescription>Filter by artisan or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filterArtisan">Artisan</Label>
              <Select
                value={selectedArtisanFilter}
                onValueChange={setSelectedArtisanFilter}
              >
                <SelectTrigger id="filterArtisan">
                  <SelectValue placeholder="All Artisans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Artisans</SelectItem>
                  {artisans?.map((artisan) => (
                    <SelectItem key={artisan.id} value={String(artisan.id)}>
                      {artisan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterStatus">Status</Label>
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
              >
                <SelectTrigger id="filterStatus">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advances Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Advances</CardTitle>
          <CardDescription>List of all recorded advances</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artisan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Date Given</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdvances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No advances found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdvances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell>
                      {artisans?.find((a) => a.id === advance.artisan)?.name ||
                        "Unknown"}
                    </TableCell>
                    <TableCell>Ksh{typeof advance.amount === 'number' ? advance.amount.toFixed(2) : parseFloat(advance.amount || '0').toFixed(2)}</TableCell>
                    <TableCell>Ksh{typeof advance.balance === 'number' ? advance.balance.toFixed(2) : parseFloat(advance.balance || '0').toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(advance.date_given).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {advance.reason || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={advance.is_settled ? "secondary" : "default"}>
                        {advance.is_settled ? "Settled" : "Outstanding"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={advance.is_settled}
                        onClick={() => handleOpenDeductDialog(advance)}
                      >
                        Deduct
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Advance Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give New Advance</DialogTitle>
            <DialogDescription>
              Record an advance payment given to an artisan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {createAdvanceError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{createAdvanceError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="artisan" className="text-right">
                Artisan
              </Label>
              <Select
                value={String(newAdvanceData.artisan)}
                onValueChange={(value) =>
                  setNewAdvanceData({ ...newAdvanceData, artisan: Number(value) })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Artisan" />
                </SelectTrigger>
                <SelectContent>
                  {artisans?.map((artisan) => (
                    <SelectItem key={artisan.id} value={String(artisan.id)}>
                      {artisan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={newAdvanceData.amount || ""}
                onChange={(e) =>
                  setNewAdvanceData({
                    ...newAdvanceData,
                    amount: Number(e.target.value),
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="reason"
                value={newAdvanceData.reason || ""}
                onChange={(e) =>
                  setNewAdvanceData({ ...newAdvanceData, reason: e.target.value })
                }
                placeholder="Reason for the advance (optional)"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateAdvance}
              disabled={isCreatingAdvance}
            >
              {isCreatingAdvance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Give Advance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduct Advance Dialog */}
      <Dialog open={isDeductDialogOpen} onOpenChange={setIsDeductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Advance</DialogTitle>
            <DialogDescription>
              Deduct an amount from the outstanding advance balance for{" "}
              {artisans?.find((a) => a.id === selectedAdvanceToDeduct?.artisan)?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {deductError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{deductError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deduct-amount" className="text-right">
                Amount to Deduct
              </Label>
              <Input
                id="deduct-amount"
                type="number"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                max={selectedAdvanceToDeduct ? Number(selectedAdvanceToDeduct.balance) : 0}
                min={0.01}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Outstanding Balance
              </Label>
              <div className="col-span-3 text-left font-medium">
                Ksh{selectedAdvanceToDeduct ? Number(selectedAdvanceToDeduct.balance).toFixed(2) : "0.00"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleDeductAdvance}
              disabled={isDeducting || deductionAmount <= 0 || deductionAmount > (selectedAdvanceToDeduct ? Number(selectedAdvanceToDeduct.balance) : 0)}
            >
              {isDeducting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deduct Amount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
