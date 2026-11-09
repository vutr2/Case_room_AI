"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** ← and → move between agenda cases, unless the presenter is typing or a dialog is open. */
export function PresentKeys({ previousHref, nextHref }: { previousHref: string | null; nextHref: string | null }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (document.querySelector("[role='dialog']")) return;
      const href = event.key === "ArrowLeft" ? previousHref : event.key === "ArrowRight" ? nextHref : null;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, previousHref, nextHref]);
  return null;
}
