import { Button } from "@ccr/ui/components/button";
import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchXIcon className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">{t("notFound.title")}</h1>
      <p className="max-w-md text-[13px] text-muted-foreground">{t("notFound.text")}</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">{t("notFound.back")}</Link>
      </Button>
    </div>
  );
}
