"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { deleteProviderProfile } from "@/app/actions/provider";
import { useAsyncAction } from "@/lib/use-async-action";

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [signingOut, doSignOut] = useAsyncAction(() => signOut());

  function handleDeleteListing() {
    if (
      !confirm(
        "Remove your provider listing? Customers won't be able to find you until you post again.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteProviderProfile();
      if (result.success) {
        toast.success("Listing removed.");
        onOpenChange(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

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
          <Separator />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-destructive">Danger zone</p>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={handleDeleteListing}
            >
              {pending && <Loader2 className="animate-spin" />}
              Remove my listing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
