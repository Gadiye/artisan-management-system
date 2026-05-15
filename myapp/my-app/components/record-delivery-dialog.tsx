"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/useApi";
import { JobItem } from "@/types";
import { useState } from "react"

interface RecordDeliveryDialogProps {
  jobItem: JobItem;
  refetchJob: () => void;
  disabled?: boolean;
}

export function RecordDeliveryDialog({ jobItem, refetchJob, disabled }: RecordDeliveryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantityReceived, setQuantityReceived] = useState("");
  const [quantityAccepted, setQuantityAccepted] = useState("");
  const [receivedPairs, setReceivedPairs] = useState("");
  const [receivedSingles, setReceivedSingles] = useState("");
  const [acceptedPairs, setAcceptedPairs] = useState("");
  const [acceptedSingles, setAcceptedSingles] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");

  // Only fetch when the dialog is open to avoid N+1 requests on list/detail pages
  const endpoint = isOpen ? `/jobs/${jobItem.job}/items/${jobItem.id}/deliveries/` : null;
  const { post } = useApi(endpoint);

  const handleSave = async () => {
    let finalQuantityReceived = 0;
    let finalQuantityAccepted = 0;

    if (jobItem.product.unit_of_measure === 'PAIRS') {
      finalQuantityReceived = (parseFloat(receivedPairs || '0') * 2) + parseFloat(receivedSingles || '0');
      finalQuantityAccepted = (parseFloat(acceptedPairs || '0') * 2) + parseFloat(acceptedSingles || '0');
    } else {
      finalQuantityReceived = parseFloat(quantityReceived || '0');
      finalQuantityAccepted = parseFloat(quantityAccepted || '0');
    }

    const payload = {
      quantity_received: finalQuantityReceived,
      quantity_accepted: finalQuantityAccepted,
      rejection_reason: rejectionReason,
      notes: notes,
    };

    await post(payload);
    refetchJob();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Record Delivery</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Delivery for {jobItem.product.product_type}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantityReceived" className="text-right">Received</Label>
            {jobItem.product.unit_of_measure === 'PAIRS' ? (
              <div className="col-span-3 flex gap-2">
                <Input
                  id="receivedPairs"
                  type="number"
                  value={receivedPairs}
                  onChange={(e) => setReceivedPairs(e.target.value)}
                  placeholder="Pairs"
                />
                <Input
                  id="receivedSingles"
                  type="number"
                  value={receivedSingles}
                  onChange={(e) => setReceivedSingles(e.target.value)}
                  placeholder="Singles"
                />
              </div>
            ) : (
              <Input
                id="quantityReceived"
                type="number"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                className="col-span-3"
              />
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantityAccepted" className="text-right">Accepted</Label>
            {jobItem.product.unit_of_measure === 'PAIRS' ? (
              <div className="col-span-3 flex gap-2">
                <Input
                  id="acceptedPairs"
                  type="number"
                  value={acceptedPairs}
                  onChange={(e) => setAcceptedPairs(e.target.value)}
                  placeholder="Pairs"
                />
                <Input
                  id="acceptedSingles"
                  type="number"
                  value={acceptedSingles}
                  onChange={(e) => setAcceptedSingles(e.target.value)}
                  placeholder="Singles"
                />
              </div>
            ) : (
              <Input
                id="quantityAccepted"
                type="number"
                value={quantityAccepted}
                onChange={(e) => setQuantityAccepted(e.target.value)}
                className="col-span-3"
              />
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rejectionReason" className="text-right">Rejection Reason</Label>
            <Select onValueChange={setRejectionReason}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QUALITY">Quality Issues</SelectItem>
                <SelectItem value="DAMAGE">Damaged Item</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <Button onClick={handleSave}>Save Delivery</Button>
      </DialogContent>
    </Dialog>
  );
}
