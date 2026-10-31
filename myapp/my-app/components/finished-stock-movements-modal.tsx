"use client";

import { useMemo } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useApi } from "@/hooks/useApi";
import { FinishedStockMovement, PaginatedResponse } from "@/types";
import { cn } from "@/lib/utils";

interface FinishedStockMovementsModalProps {
  stockId: number | null;
  productLabel?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FinishedStockMovementsModal({
  stockId,
  productLabel,
  isOpen,
  onClose,
}: FinishedStockMovementsModalProps) {
  const endpoint =
    isOpen && stockId
      ? `/inventory/finished-stock/${stockId}/movements/`
      : null;

  const { data, loading, error } = useApi<
    PaginatedResponse<FinishedStockMovement> | FinishedStockMovement[]
  >(endpoint);

  const movements = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
  }, [data]);

  const totals = useMemo(
    () =>
      movements.reduce(
        (acc, movement) => {
          if (movement.movement_type === "IN") acc.in += movement.quantity;
          else acc.out += movement.quantity;
          return acc;
        },
        { in: 0, out: 0 }
      ),
    [movements]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Finished Stock Movements
          </DialogTitle>
          <DialogDescription>
            {productLabel
              ? `Stock in / out history for ${productLabel}.`
              : "Stock in / out history for this product."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-wrap gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5">
            <ArrowDownToLine className="h-3 w-3" />
            {totals.in} in
          </Badge>
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5">
            <ArrowUpFromLine className="h-3 w-3" />
            {totals.out} out
          </Badge>
          <Badge variant="outline" className="text-gray-600">
            {movements.length} movement{movements.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="mt-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading movement history...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not load movements</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && movements.length > 0 && (
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border">
              <Table>
                <TableHeader className="bg-gray-50/70 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-gray-700">Date</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Type</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 text-right">Qty</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 text-right">Balance</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 text-right">Avg Cost</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => {
                    const isIn = movement.movement_type === "IN";
                    return (
                      <TableRow key={movement.id} className="hover:bg-gray-50/50">
                        <TableCell className="whitespace-nowrap text-xs font-medium text-gray-700">
                          {new Date(movement.created_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "gap-1 border font-bold text-[10px] uppercase",
                              isIn
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            {isIn ? (
                              <ArrowDownToLine className="h-3 w-3" />
                            ) : (
                              <ArrowUpFromLine className="h-3 w-3" />
                            )}
                            {isIn ? "In" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-sm font-extrabold",
                            isIn ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {isIn ? "+" : "-"}
                          {movement.quantity}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-gray-800">
                          {movement.balance_after}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-gray-600">
                          Ksh {Number(movement.average_cost || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="truncate text-xs font-semibold text-gray-800">
                            {movement.reference || "—"}
                          </p>
                          {movement.note && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {movement.note}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && movements.length === 0 && (
            <div className="rounded-xl border bg-muted/20 py-12 text-center">
              <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                No movements recorded yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Stock in entries and sales deductions will appear here.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
