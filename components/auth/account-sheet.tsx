"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Megaphone,
  Store,
  Wrench,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useAsyncAction } from "@/lib/use-async-action";
import { NavLinkStatus } from "@/components/nav-link-status";
import { ProviderProfileFormModal } from "@/components/providers/provider-profile-form-modal";
import { MyAdsModal } from "@/components/ads/my-ads-modal";
import { SettingsModal } from "@/components/settings/settings-modal";
import { TeamModal } from "@/components/shop/team-modal";

type AccountContext = {
  platform: { isMember: boolean; permissions: string[] };
  shop: { providerId: string; permissions: string[] } | null;
};

export function AccountSheet({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
}) {
  const [postOpen, setPostOpen] = useState(false);
  const [adsOpen, setAdsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [context, setContext] = useState<AccountContext | null>(null);
  const [signingOut, doSignOut] = useAsyncAction(() => signOut());
  const pathname = usePathname();
  // Keep the sheet (and whatever page is behind it) visible while /admin
  // loads instead of closing immediately — only auto-close once the admin
  // page has actually landed, not just because we happen to already be
  // there. A ref (not state) so setting it never itself triggers a render.
  const goingToAdminRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/me/context")
      .then((res) => (res.ok ? res.json() : null))
      .then(setContext);
  }, [open]);

  useEffect(() => {
    if (goingToAdminRef.current && pathname === "/admin") {
      onOpenChange(false);
      goingToAdminRef.current = false;
    }
  }, [pathname, onOpenChange]);

  const canManageTeam = context?.shop?.permissions.includes("MANAGE_TEAM") ?? false;
  const isPlatformMember = context?.platform.isMember ?? false;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback>
                  {session.user.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <SheetTitle>{session.user.name}</SheetTitle>
                <SheetDescription>{session.user.email}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-1 px-4">
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => setPostOpen(true)}
            >
              <Wrench /> Post your service
            </Button>
            <Link
              href="/shop/manage"
              className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}
              onClick={() => onOpenChange(false)}
            >
              <Store /> My shop
            </Link>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => setAdsOpen(true)}
            >
              <Megaphone /> My ads
            </Button>
            {canManageTeam && (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setTeamOpen(true)}
              >
                <Users /> Team
              </Button>
            )}
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon /> Settings
            </Button>
            {isPlatformMember && (
              <Link
                href="/admin"
                className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}
                onClick={() => {
                  goingToAdminRef.current = true;
                }}
              >
                <ShieldCheck /> Admin
                <NavLinkStatus />
              </Link>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" disabled={signingOut} onClick={() => doSignOut()}>
              {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ProviderProfileFormModal open={postOpen} onOpenChange={setPostOpen} />
      <MyAdsModal open={adsOpen} onOpenChange={setAdsOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      {canManageTeam && (
        <TeamModal open={teamOpen} onOpenChange={setTeamOpen} />
      )}
    </>
  );
}
