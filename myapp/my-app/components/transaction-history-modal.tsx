"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaginatedResponse } from "@/types";

interface Transaction {
  id: number;
  job: number;
  product: number;
  from_stage: string;
  to_stage: string;
  quantity: number;
  timestamp: string;
}

interface TransactionHistoryModalProps {
  productId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

function useProductTransactions(productId: number | null) {
  const { data, ...rest } = useApi<PaginatedResponse<Transaction>>(
    productId ? `/products/${productId}/transactions/` : null
  );

  const transactions = data?.results;

  return { data: transactions, ...rest };
}

export function TransactionHistoryModal({
  productId,
  isOpen,
  onClose,
}: TransactionHistoryModalProps) {
  const {
    data: transactions,
    loading,
    error,
  } = useProductTransactions(productId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Product Transaction History</DialogTitle>
          <DialogDescription>
            Showing the full movement history for product ID: {productId}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>From Stage</TableHead>
                  <TableHead>To Stage</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant="secondary">{tx.job}</Badge>
                    </TableCell>
                    <TableCell>{tx.from_stage}</TableCell>
                    <TableCell>{tx.to_stage}</TableCell>
                    <TableCell className="text-right">{tx.quantity}</TableCell>
                    <TableCell>
                      {new Date(tx.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : transactions && (
            <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
              <p>No transactions found for this product.</p>
              <p className="text-xs mt-1">Movement records are created when jobs are started or deliveries are accepted.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
