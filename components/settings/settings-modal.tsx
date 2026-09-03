"use client";

import { Loader2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAsyncAction } from "@/lib/use-async-action";

// Removing a shop listing now lives in the shop-management dashboard's
// "Shop profile" editor (components/providers/provider-profile-form-modal.tsx)
// instead of here — a user can own several shops, and deletion needs to know
// which one, a context this account-level modal doesn't have.
export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [signingOut, doSignOut] = useAsyncAction(() => signOut());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>{session?.user?.email}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button variant="outline" disabled={signingOut} onClick={() => doSignOut()}>
            {signingOut && <Loader2 className="animate-spin" />}
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
