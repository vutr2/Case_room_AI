import { en, type MessageKey } from "./messages/en";
import type { TranslateParams, Translator } from "./translate";

/**
 * Services write user-facing errors in English (logs and tests read them).
 * The "server.*" dictionary keys repeat those texts, `{name}` standing for a
 * value; this maps an English message back to its key, with the values, and
 * renders it in the reader's language. Values that are themselves messages
 * (a wait time such as "5 minutes") are translated too. A message without an
 * entry is shown in English.
 */
interface Matcher {
  key: MessageKey;
  pattern: RegExp;
  names: string[];
}

let exact: Map<string, MessageKey> | null = null;
let templates: Matcher[] = [];

function index() {
  if (exact) return exact;
  exact = new Map();
  for (const key of Object.keys(en) as MessageKey[]) {
    if (!key.startsWith("server.")) continue;
    const text: string = en[key];
    const names = [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
    if (names.length === 0) {
      exact.set(text, key);
      continue;
    }
    const source = text
      .split(/\{\w+\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("(.+?)");
    templates.push({ key, pattern: new RegExp(`^${source}$`), names });
  }
  // Longer templates first, so the most specific one wins.
  templates = templates.sort((a, b) => en[b.key].length - en[a.key].length);
  return exact;
}

export function translateServerMessage(message: string, t: Translator, depth = 0): string {
  if (t.locale === "en" || !message) return message;
  const key = index().get(message);
  if (key) return t(key);
  for (const { key: templateKey, pattern, names } of templates) {
    const match = pattern.exec(message);
    if (!match) continue;
    const params: TranslateParams = {};
    names.forEach((name, i) => {
      const value = match[i + 1] ?? "";
      params[name] = depth < 2 ? translateServerMessage(value, t, depth + 1) : value;
    });
    return t(templateKey, params);
  }
  return message;
}
