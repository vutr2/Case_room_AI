import { ShieldAlertIcon } from "lucide-react";
import { getI18n } from "@/i18n/server";

/**
 * Persistent safety notice shown on every authenticated screen. It also links
 * to the source code of the running version (AGPL-3.0, section 13): deployments
 * set SOURCE_CODE_URL to the repository of the code they run.
 */
export async function SafetyBanner() {
  const { t } = await getI18n();
  const sourceCodeUrl = process.env.SOURCE_CODE_URL;
  return (
    <div className="no-print flex shrink-0 items-center gap-2 border-t bg-card px-4 py-1.5 text-[11.5px] text-muted-foreground">
      <ShieldAlertIcon className="size-3.5 shrink-0 text-draft" />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-foreground/80">{t("safety.review")}</span> {t("safety.scope")}
      </span>
      {sourceCodeUrl && (
        <a href={sourceCodeUrl} target="_blank" rel="noreferrer" className="shrink-0 hover:text-foreground hover:underline">
          {t("safety.sourceCode")}
        </a>
      )}
    </div>
  );
}
