"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { User, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { AccountSheet } from "@/components/auth/account-sheet";
import { AdvertiseFormModal } from "@/components/ads/advertise-form-modal";
import { InstallButton } from "@/components/install-button";
import { ModeToggle } from "@/components/mode-toggle";

export function Header() {
  const { data: session, status } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [advertiseOpen, setAdvertiseOpen] = useState(false);

  function handleAccountClick() {
    if (session) {
      setAccountOpen(true);
    } else {
      setSignInOpen(true);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/logo.png"
            alt="AutoRescue"
            width={547}
            height={487}
            priority
            className="h-9 w-auto rounded-md"
          />
          <span className="hidden sm:inline">Drive with confidence</span>
        </Link>
        <InstallButton />
      </div>

      <nav className="flex items-center gap-1">
        <Button variant="ghost" onClick={() => setAdvertiseOpen(true)}>
          <Megaphone /> <span className="hidden sm:inline">Advertise</span>
        </Button>
        <ModeToggle />
        <Button
          variant="ghost"
          onClick={handleAccountClick}
          disabled={status === "loading"}
        >
          <User /> Account
        </Button>
      </nav>

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
      {session && (
        <AccountSheet
          open={accountOpen}
          onOpenChange={setAccountOpen}
          session={session}
        />
      )}
      <AdvertiseFormModal open={advertiseOpen} onOpenChange={setAdvertiseOpen} />
    </header>
  );
}
