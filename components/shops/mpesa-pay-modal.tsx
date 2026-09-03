"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initiatePromotionPayment, initiateBadgePayment } from "@/app/actions/payment";
import type { ActionState } from "@/app/actions/types";
import {
  PROMOTION_LOCAL_RATE_KES,
  PROMOTION_UNIVERSAL_RATE_KES,
  VERIFICATION_BADGE_RATE_KES,
} from "@/lib/validations";

type Props =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      purpose: "PROMOTION";
      shopAdId: string;
      isUniversal: boolean;
      onPaid: () => void;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      purpose: "BADGE";
      providerId: string;
      onPaid: () => void;
    };

const POLL_INTERVAL_MS = 3000;

type PaymentActionState = ActionState & { paymentId?: string };
const initialPaymentState: PaymentActionState = {};

export function MpesaPayModal(props: Props) {
  const { open, onOpenChange, purpose, onPaid } = props;
  const action = purpose === "PROMOTION" ? initiatePromotionPayment : initiateBadgePayment;
  const [state, formAction, pending] = useActionState(action, initialPaymentState);
  const [days, setDays] = useState("1");
  const [waiting, setWaiting] = useState(false);

  const rate =
    purpose === "PROMOTION"
      ? props.isUniversal
        ? PROMOTION_UNIVERSAL_RATE_KES
        : PROMOTION_LOCAL_RATE_KES
      : VERIFICATION_BADGE_RATE_KES;
  const daysNum = Math.max(1, Number(days) || 1);
  const total = rate * daysNum;

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  // Starts polling as soon as a new paymentId shows up. Adjusting state
  // directly during render (guarded by comparing against the previous
  // value) instead of an effect — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  const [trackedPaymentId, setTrackedPaymentId] = useState<string | undefined>(undefined);
  if (state.paymentId && state.paymentId !== trackedPaymentId) {
    setTrackedPaymentId(state.paymentId);
    setWaiting(true);
  }

  // Polls until the M-Pesa callback (app/api/mpesa/callback/route.ts) has
  // flipped the Payment row out of PENDING, once the customer approves (or
  // declines) the STK push on their phone.
  useEffect(() => {
    if (!waiting || !state.paymentId) return;
    const paymentId = state.paymentId;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/me/payments/${paymentId}`);
      const data = await res.json();
      if (!data.payment || data.payment.status === "PENDING") return;
      clearInterval(interval);
      setWaiting(false);
      if (data.payment.status === "COMPLETED") {
        toast.success("Payment received.");
        onOpenChange(false);
        onPaid();
      } else {
        toast.error(data.payment.resultDesc || "Payment wasn't completed.");
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, state.paymentId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !waiting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {purpose === "PROMOTION" ? "Pay to promote" : "Get verified"}
          </DialogTitle>
          <DialogDescription>
            {purpose === "PROMOTION"
              ? `KES ${rate}/day (${props.isUniversal ? "universal" : "local"} reach). You'll get an M-Pesa prompt on your phone.`
              : `KES ${rate}/day lifts your shop out of the 100m unverified visibility cap for as long as it stays paid up.`}
          </DialogDescription>
        </DialogHeader>

        {waiting ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Check your phone and enter your M-Pesa PIN to complete the
              payment…
            </p>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            {purpose === "PROMOTION" && (
              <input type="hidden" name="shopAdId" value={props.shopAdId} />
            )}
            {purpose === "BADGE" && (
              <input type="hidden" name="providerId" value={props.providerId} />
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="phone">M-Pesa phone number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="07XXXXXXXX"
                required
              />
              {state.fieldErrors?.phone && (
                <p className="text-xs text-destructive">{state.fieldErrors.phone[0]}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="days">Days</Label>
              <Input
                id="days"
                name="days"
                type="number"
                min={1}
                max={purpose === "PROMOTION" ? 90 : 365}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
              />
              {state.fieldErrors?.days && (
                <p className="text-xs text-destructive">{state.fieldErrors.days[0]}</p>
              )}
            </div>
            <p className="text-sm font-medium">Total: KES {total.toLocaleString()}</p>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Smartphone />
                )}
                {pending ? "Sending…" : "Pay with M-Pesa"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
