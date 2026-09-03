"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

function isTouchDevice() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

// Never renders a phone number as plain, unguarded text. On a touch device
// (phone/tablet) there's nothing to "reveal" — it's a direct-dial `tel:`
// link straight away. On desktop/laptop it starts as a "Show number" button
// and only renders the digits (as a `tel:` link) once clicked.
export function PhoneReveal({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  const [isTouch, setIsTouch] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Client-only check (matches SSR's `false` on first paint, then corrects
  // itself) — checking synchronously during render would mismatch whatever
  // the server rendered and trigger a hydration error.
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  if (isTouch || revealed) {
    return (
      <a
        href={`tel:${phone}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1.5 text-primary hover:underline",
          className,
        )}
      >
        <Phone className="size-3.5 shrink-0" />
        {isTouch ? "Call" : phone}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-primary hover:underline",
        className,
      )}
    >
      <Phone className="size-3.5 shrink-0" />
      Show number
    </button>
  );
}
