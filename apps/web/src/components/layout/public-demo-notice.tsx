import { InfoIcon } from "lucide-react";
import { isPublicDemo } from "@/server/demo-mode";

/** On the public demo, says why changes to accounts and the organization are refused. */
export function PublicDemoNotice() {
  if (!isPublicDemo()) return null;
  return (
    <p role="note" className="flex items-start gap-2 rounded-md border border-draft-border bg-draft-soft px-3 py-2 text-[13px] text-draft">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>
        Public demo: changes to accounts, members, invitations and the organization are turned off. Everything else works, and the demo data is
        reset every night.
      </span>
    </p>
  );
}
