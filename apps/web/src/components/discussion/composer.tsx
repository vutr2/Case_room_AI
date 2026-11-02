"use client";

import { Button } from "@ccr/ui/components/button";
import { Kbd } from "@ccr/ui/components/misc";
import { cn } from "@ccr/ui/lib/utils";
import { ArrowUpIcon, SparklesIcon } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import type { UserSummary } from "@/lib/dto";
import { AIAvatar, UserAvatar } from "../shared/user-avatar";

const SUGGESTIONS = ["composer.suggest.1", "composer.suggest.2", "composer.suggest.3", "composer.suggest.4", "composer.suggest.5"] as const;

interface MentionOption {
  key: string;
  handle: string;
  label: string;
  detail: string;
  user?: UserSummary;
}

export function Composer({
  members,
  currentUserId,
  canAskAI,
  disabled,
  onSend,
  onTyping,
}: {
  members: UserSummary[];
  currentUserId: string;
  canAskAI: boolean;
  disabled?: boolean;
  onSend: (content: string) => Promise<boolean>;
  onTyping: () => void;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useI18n();

  const options = useMemo<MentionOption[]>(() => {
    const all: MentionOption[] = [
      ...(canAskAI ? [{ key: "ai", handle: "AI", label: t("avatar.ai"), detail: t("composer.aiDetail") }] : []),
      ...members
        .filter((member) => member.id !== currentUserId)
        .map((member) => ({
          key: member.id,
          handle: member.handle,
          label: member.name,
          detail: member.specialty ?? t(`enum.role.${member.role}`),
          user: member,
        })),
    ];
    if (!mention) return [];
    const query = mention.query.toLowerCase();
    return all.filter((option) => option.handle.toLowerCase().startsWith(query) || option.label.toLowerCase().includes(query)).slice(0, 7);
  }, [mention, members, currentUserId, canAskAI, t]);

  function updateMention(text: string, caret: number) {
    const before = text.slice(0, caret);
    const match = /(^|\s)@([A-Za-z0-9_]*)$/.exec(before);
    if (match) {
      setMention({ start: caret - match[2]!.length - 1, query: match[2]! });
      setActiveIndex(0);
    } else {
      setMention(null);
    }
  }

  function insertMention(option: MentionOption) {
    if (!mention) return;
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}@${option.handle} ${value.slice(caret)}`;
    setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      const position = mention.start + option.handle.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
    });
  }

  async function send() {
    const content = value.trim();
    if (!content || sending || disabled) return;
    setSending(true);
    setValue("");
    setMention(null);
    const ok = await onSend(content);
    if (!ok) setValue(content);
    setSending(false);
    textareaRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && options.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(options[activeIndex]!);
        return;
      }
      if (event.key === "Escape") {
        setMention(null);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  const mentionsAI = /(^|\s)@ai\b/i.test(value);

  return (
    <div className="relative">
      {mention && options.length > 0 && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg">
          <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">{t("composer.mention")}</div>
          {options.map((option, index) => (
            <button
              key={option.key}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn("flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left", index === activeIndex && "bg-accent")}
            >
              {option.user ? <UserAvatar user={option.user} size="sm" /> : <AIAvatar size="sm" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {option.label} <span className="font-normal text-muted-foreground">@{option.handle}</span>
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{option.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {value.length === 0 && canAskAI && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((key) => t(key)).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setValue(`${suggestion} `);
                textareaRef.current?.focus();
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-ai-border bg-ai-soft px-2.5 py-1 text-[11.5px] text-ai transition-colors hover:bg-ai-soft/60"
            >
              <SparklesIcon className="size-3" />
              {suggestion.replace("@AI ", "")}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border bg-card p-2 shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/15",
          mentionsAI && "border-ai-border focus-within:border-ai focus-within:ring-ai/15",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            updateMention(event.target.value, event.target.selectionStart);
            onTyping();
          }}
          onKeyDown={onKeyDown}
          onClick={(event) => updateMention(value, event.currentTarget.selectionStart)}
          placeholder={disabled ? t("composer.noPermission") : t("composer.placeholder")}
          className="field-sizing-content max-h-48 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] leading-relaxed outline-none placeholder:text-muted-foreground/80"
        />
        <Button size="icon-sm" variant={mentionsAI ? "ai" : "default"} onClick={() => void send()} disabled={!value.trim() || sending || disabled} aria-label={t("composer.send")}>
          <ArrowUpIcon />
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>
          {mentionsAI ? (
            <span className="text-ai">{t("composer.aiWillAnswer")}</span>
          ) : (
            t("composer.aiDrafts")
          )}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          {rich(t("composer.keys"), { enter: <Kbd>Enter</Kbd>, shift: <Kbd>Shift</Kbd> })}
        </span>
      </div>
    </div>
  );
}
