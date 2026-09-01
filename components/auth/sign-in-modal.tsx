"use client";

import { signIn } from "next-auth/react";
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
  const [signingIn, doSignIn] = useAsyncAction(() => signIn("google"));

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
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
