"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Landmark, DollarSign, Wallet, Clock, Loader2, Sparkles, AlertCircle, ArrowLeft, ArrowUpRight } from "lucide-react";
import { useArtisans, useAdvances } from "@/hooks/useResource";
import { api } from "@/lib/api";
import { ArtisanAdvance } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function AdvancesPage() {
  const { data: artisans, loading: artisansLoading, error: artisansError } = useArtisans();
  const { data: advances, loading: advancesLoading, error: advancesError, refetch: refetchAdvances } = useAdvances();

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isDeductDialogOpen, setIsDeductDialogOpen] = useState(false);
  const [selectedAdvanceToDeduct, setSelectedAdvanceToDeduct] = useState<ArtisanAdvance | null>(null);

  // New advance form
  const [selectedArtisan, setSelectedArtisan] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  // Deduct form
  const [deductAmount, setDeductAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const safeAdvances = (advances || []) as ArtisanAdvance[];
  const safeArtisans = artisans || [];

  const totalAdvances = safeAdvances.reduce((sum: number, a: ArtisanAdvance) => sum + Number(a.amount || 0), 0);
  const outstandingAdvances = safeAdvances.reduce((sum: number, a: ArtisanAdvance) => sum + Number(a.balance || 0), 0);
  const settledAdvances = totalAdvances - outstandingAdvances;

  const handleGiveAdvance = async () => {
    if (!selectedArtisan || !amount) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      await api.financials.advances.create({
        artisan: parseInt(selectedArtisan),
        amount: parseFloat(amount),
        reason: reason || undefined,
      });
      setIsNewDialogOpen(false);
      setSelectedArtisan("");
      setAmount("");
      setReason("");
      refetchAdvances();
    } catch (err: unknown) {
      setDialogError((err as Error).message || "Failed to assign advance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeductDialog = (advance: ArtisanAdvance) => {
    setSelectedAdvanceToDeduct(advance);
    setDeductAmount("");
    setDialogError(null);
    setIsDeductDialogOpen(true);
  };

  const handleDeductAdvance = async () => {
    if (!selectedAdvanceToDeduct || !deductAmount) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      await api.financials.advances.deduct(
        selectedAdvanceToDeduct.id,
        parseFloat(deductAmount)
      );
      setIsDeductDialogOpen(false);
      setSelectedAdvanceToDeduct(null);
      setDeductAmount("");
      refetchAdvances();
    } catch (err: unknown) {
      setDialogError((err as Error).message || "Failed to execute deduction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (artisansLoading || advancesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-8 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (artisansError || advancesError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Ledger Error</AlertTitle>
          <AlertDescription>
            {artisansError instanceof Error ? artisansError.message : advancesError instanceof Error ? advancesError.message : "Failed to load advances matrix."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100 transition-colors -ml-3 mb-1">
            <Link href="/financials">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ledger
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Artisan Advances</h1>
          <p className="text-sm font-semibold text-muted-foreground">Distribute short-term advances and track active outstanding balances</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* New Advance Dialog */}
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 font-bold text-xs uppercase px-5 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus className="mr-2 h-4 w-4 stroke-[3]" />
                Give Advance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-gray-200 rounded-2xl shadow-xl">
              <DialogHeader className="pb-3 border-b">
                <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  Grant New Advance
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
                  Issue cash or credit advance to an active artisan
                </DialogDescription>
              </DialogHeader>

              {dialogError && (
                <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50 text-red-950 text-xs">
                  <AlertDescription>{dialogError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="artisan-new" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Select Artisan *</Label>
                  <Select value={selectedArtisan} onValueChange={setSelectedArtisan}>
                    <SelectTrigger id="artisan-new" className="bg-white border-gray-300 font-medium text-sm h-11">
                      <SelectValue placeholder="Choose an artisan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {safeArtisans.map((artisan) => (
                        <SelectItem key={artisan.id} value={artisan.id.toString()} className="text-sm font-semibold">
                          {artisan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount-new" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Advance Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Ksh</span>
                    <Input
                      id="amount-new"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-11 h-11 border-gray-300 font-extrabold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reason-new" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Reason (Optional)</Label>
                  <Textarea
                    id="reason-new"
                    placeholder="Reason for advance payment allocation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="border-gray-300 font-medium text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t mt-6 justify-end">
                <Button variant="outline" onClick={() => setIsNewDialogOpen(false)} className="h-11 px-4 text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button
                  onClick={handleGiveAdvance}
                  disabled={!selectedArtisan || !amount || submitting}
                  className="h-11 px-5 text-xs font-bold uppercase shadow-md animate-in fade-in"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Issue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Landmark className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Total Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 tracking-tight">
              Ksh {totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-blue-800/80 font-bold mt-1">Cumulative principal advances granted</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Wallet className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              Ksh {outstandingAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-amber-800/80 font-bold mt-1">Awaiting payroll pay-period deductions</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Settled Advances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              Ksh {settledAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-800/80 font-bold mt-1">Successfully recovered advance amounts</p>
          </CardContent>
        </Card>
      </div>

      {/* History Ledger Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">Advances Ledger</CardTitle>
          <CardDescription className="text-xs font-semibold">Registry of historical artisan credit advances</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/30">
              <TableRow>
                <TableHead className="font-bold text-gray-700 text-xs pl-6">Artisan</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Principal Amount</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">Outstanding Balance</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Date Allocated</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Reason</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Status Badge</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-center pr-6">Deduction Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeAdvances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-bold">
                    No advance records identified in active database ledger.
                  </TableCell>
                </TableRow>
              ) : (
                safeAdvances.map((adv: ArtisanAdvance) => {
                  const artisanName = safeArtisans.find((a) => a.id === adv.artisan)?.name || "Unknown";
                  const isSettled = adv.is_settled;
                  return (
                    <TableRow key={adv.id} className="hover:bg-slate-50/30 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-extrabold text-xs text-gray-700">
                            {artisanName.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                          </div>
                          <div className="font-extrabold text-sm text-gray-900">{artisanName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-sm text-gray-900 py-4">
                        Ksh {Number(adv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-sm text-amber-600 py-4">
                        Ksh {Number(adv.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-gray-700 py-4">
                        {new Date(adv.date_given).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs font-semibold text-gray-600 py-4">
                        {adv.reason || "—"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          variant="outline" 
                          className={`font-bold text-[9px] uppercase border px-2 py-0.5 w-fit ${
                            isSettled 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isSettled ? "Settled" : "Outstanding"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center pr-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSettled}
                          onClick={() => handleOpenDeductDialog(adv)}
                          className="h-8 font-bold text-[10px] uppercase px-3.5"
                        >
                          Deduct
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deduct Dialog */}
      <Dialog open={isDeductDialogOpen} onOpenChange={setIsDeductDialogOpen}>
        <DialogContent className="max-w-md border-gray-200 rounded-2xl shadow-xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Minus className="h-5 w-5 text-indigo-600" />
              Deduct Advance Balance
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
              Deduct from advance balance for {safeArtisans.find((a) => a.id === selectedAdvanceToDeduct?.artisan)?.name}
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50 text-red-950 text-xs">
              <AlertDescription>{dialogError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="deduct-amount" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Deduction Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Ksh</span>
                <Input
                  id="deduct-amount"
                  type="number"
                  placeholder="0.00"
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value)}
                  className="pl-11 h-11 border-gray-300 font-extrabold text-sm"
                  max={selectedAdvanceToDeduct ? Number(selectedAdvanceToDeduct.balance) : 0}
                  min={0.01}
                />
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-gray-600">Remaining Balance:</span>
              <span className="font-extrabold text-sm text-gray-950">
                Ksh {selectedAdvanceToDeduct ? Number(selectedAdvanceToDeduct.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t mt-6 justify-end">
            <Button variant="outline" onClick={() => setIsDeductDialogOpen(false)} className="h-11 px-4 text-xs font-bold uppercase">
              Cancel
            </Button>
            <Button
              onClick={handleDeductAdvance}
              disabled={!selectedAdvanceToDeduct || !deductAmount || submitting || parseFloat(deductAmount) <= 0 || parseFloat(deductAmount) > (selectedAdvanceToDeduct ? Number(selectedAdvanceToDeduct.balance) : 0)}
              className="h-11 px-5 text-xs font-bold uppercase bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deduct Amount
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
