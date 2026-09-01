"use client";

import { useEffect, useState } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

// Must render as a child of <Link> — useLinkStatus reads the nearest
// enclosing link's pending state. Debounced so fast navigations (the common
// case, since the current page stays visible until the destination is
// ready) never flash a spinner — only genuinely slow ones show it.
export function NavLinkStatus() {
  const { pending } = useLinkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!pending || !show) return null;
  return <Loader2 className="size-3 animate-spin" />;
}
