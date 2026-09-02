"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Not in the DOM lib's Event types yet — Chromium-only API.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag — no `beforeinstallprompt` there.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Always visible (until actually installed): Chromium browsers get the real
// native prompt when `beforeinstallprompt` has fired; everyone else — or a
// Chromium browser that hasn't fired it yet (no engagement heuristic met) —
// gets manual "how to install" instructions instead, so the button isn't
// just silently absent on a first visit.
export function InstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) setInstalled(true);

    // Chrome never fires `beforeinstallprompt` without an active service
    // worker — register the pass-through one at public/sw.js. Safe to call
    // on every mount; the browser no-ops if it's already registered.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (!installEvent) {
      setInstructionsOpen(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Install AutoRescue app"
        title="Install app"
        onClick={handleClick}
      >
        <Download />
      </Button>
      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install AutoRescue</DialogTitle>
            <DialogDescription>
              Add AutoRescue to your home screen for quick, app-like access.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-3 text-sm">
            <li>
              <span className="font-medium">Chrome / Edge (Android or desktop):</span>{" "}
              open the browser menu (⋮) and tap &ldquo;Install app&rdquo; or
              &ldquo;Add to Home screen&rdquo;.
            </li>
            <li>
              <span className="font-medium">Safari (iPhone / iPad):</span> tap the
              Share icon, then &ldquo;Add to Home Screen&rdquo;.
            </li>
            <li>
              <span className="font-medium">Firefox:</span> open the menu and tap
              &ldquo;Install&rdquo; or &ldquo;Add to Home screen&rdquo;.
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
