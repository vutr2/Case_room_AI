"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ccr/ui/components/dropdown-menu";
import { cn } from "@ccr/ui/lib/utils";
import type { UserRole } from "@ccr/types";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  CheckSquareIcon,
  FolderHeartIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages/en";
import { logoutAction } from "@/server/actions/auth";
import { UserAvatar } from "../shared/user-avatar";
import { useSetLocale } from "./language-switcher";
import { LogoMark } from "./logo";
import { OrganizationSwitcher, type OrganizationOption } from "./organization-switcher";

interface SidebarProps {
  user: { id: string; name: string; email: string; role: UserRole; title: string | null };
  organization: { id: string; name: string };
  organizations: OrganizationOption[];
  counts: { openTasks: number; pendingApprovals: number };
}

const NAV: Array<{ href: string; label: MessageKey; icon: LucideIcon; count?: "openTasks" | "pendingApprovals" }> = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboardIcon, count: "pendingApprovals" as const },
  { href: "/cases", label: "nav.cases", icon: FolderHeartIcon },
  { href: "/tasks", label: "nav.tasks", icon: CheckSquareIcon, count: "openTasks" as const },
  { href: "/team", label: "nav.team", icon: UsersIcon },
  { href: "/settings", label: "nav.settings", icon: SettingsIcon },
];

export function AppSidebar({ user, organization, organizations, counts }: SidebarProps) {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const { setLocale } = useSetLocale();

  return (
    <aside className="no-print flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <LogoMark className="size-7" />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold text-foreground">{t("app.name")}</div>
          <div className="truncate text-[11px] text-muted-foreground">{t("app.tagline")}</div>
        </div>
      </div>

      <div className="px-3 pt-3">
        <div className="text-[10.5px] font-semibold tracking-wider text-muted-foreground/80 uppercase">{t("nav.organization")}</div>
        <OrganizationSwitcher activeId={organization.id} organizations={organizations} />
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.count ? counts[item.count] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active ? "bg-sidebar-accent text-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
              <span className="flex-1">{t(item.label)}</span>
              {count > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10.5px] font-semibold text-primary tabular-nums">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 p-3">
        <div className="rounded-lg border border-sidebar-border bg-card px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <SparklesIcon className="size-3.5 text-ai" />
            {t("nav.aiAssistant")}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-ring/30">
              <UserAvatar user={user} size="md" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-medium text-foreground">{user.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user.title ?? t(`enum.role.${user.role}`)}</div>
              </div>
              <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="text-[13px] font-medium text-foreground">{user.name}</div>
              <div className="font-normal">{user.email}</div>
              <div className="mt-1 font-normal">{t(`enum.role.${user.role}`)}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <SettingsIcon />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-normal">{t("language.label")}</DropdownMenuLabel>
            {LOCALES.map((option) => (
              <DropdownMenuItem key={option} onSelect={() => option !== locale && setLocale(option)}>
                {option === locale ? <CheckIcon /> : <span aria-hidden className="size-4" />}
                {LOCALE_NAMES[option]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logoutAction()}>
              <LogOutIcon />
              {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
