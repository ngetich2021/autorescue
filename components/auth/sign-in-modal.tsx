"use client";

import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAsyncAction } from "@/lib/use-async-action";

export function SignInModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // signIn() makes a few sequential round-trips (providers, csrf, signin)
  // before it can redirect to Google — without a catch here, any of those
  // failing (offline, a slow/cold server) left the button disabled with a
  // spinner and no way to tell the user anything went wrong.
  const [signingIn, doSignIn] = useAsyncAction(async () => {
    try {
      await signIn("google");
    } catch {
      toast.error("Couldn't reach Google to sign in. Check your connection and try again.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in as a provider</DialogTitle>
          <DialogDescription>
            Mechanics, fuel and tow providers sign in to list their services,
            manage their shop, and receive rescue requests. Customers never
            need an account to ask for help.
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full" disabled={signingIn} onClick={() => doSignIn()}>
          {signingIn && <Loader2 className="animate-spin" />}
          {signingIn ? "Redirecting to Google…" : "Continue with Google"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
