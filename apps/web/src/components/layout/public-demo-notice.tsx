import { InfoIcon } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { isPublicDemo } from "@/server/demo-mode";

/** On the public demo, says why changes to accounts and the organization are refused. */
export async function PublicDemoNotice() {
  if (!isPublicDemo()) return null;
  const { t } = await getI18n();
  return (
    <p role="note" className="flex items-start gap-2 rounded-md border border-draft-border bg-draft-soft px-3 py-2 text-[13px] text-draft">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>{t("publicDemo.notice")}</span>
    </p>
  );
}
