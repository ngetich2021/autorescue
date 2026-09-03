"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DetailField } from "./detail-field";
import { PhoneReveal } from "@/components/phone-reveal";

export type PaymentDetailRow = {
  id: string;
  purpose: string;
  amount: number;
  phone: string;
  status: string;
  days: number | null;
  mpesaReceiptNumber: string | null;
  resultDesc: string | null;
  createdAt: string | Date;
  providerId: string;
  provider: { businessName: string; user: { name: string | null; email: string | null } };
};

const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  PROMOTION: "Promotion",
  BADGE: "Verification badge",
};

function paymentStatusVariant(status: string): "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "secondary";
  if (status === "FAILED") return "destructive";
  return "outline";
}

// View-only — a Payment is a financial audit record; only the M-Pesa
// callback (app/api/mpesa/callback/route.ts) should ever change one.
export function PaymentDetailModal({
  payment,
  open,
  onOpenChange,
}: {
  payment: PaymentDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {PAYMENT_PURPOSE_LABELS[payment.purpose] ?? payment.purpose} — KES{" "}
            {payment.amount.toLocaleString()}
          </DialogTitle>
          <DialogDescription>
            {payment.provider.businessName} (
            {payment.provider.user.name ?? payment.provider.user.email ?? "Unknown"})
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Status">
            <Badge variant={paymentStatusVariant(payment.status)}>{payment.status}</Badge>
          </DetailField>
          <DetailField label="Days">{payment.days ?? "—"}</DetailField>
          <DetailField label="Phone">
            <PhoneReveal phone={payment.phone} />
          </DetailField>
          <DetailField label="M-Pesa receipt">
            {payment.mpesaReceiptNumber ?? "—"}
          </DetailField>
          <DetailField label="Result" full>
            {payment.resultDesc ?? "—"}
          </DetailField>
          <DetailField label="Date">
            {new Date(payment.createdAt).toLocaleString()}
          </DetailField>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
