import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "./config";
import { createFormat } from "./format";
import { en } from "./messages/en";
import { vi } from "./messages/vi";
import { translateServerMessage } from "./server-messages";
import { makeTranslator } from "./translate";

const tEn = makeTranslator(en, "en");
const tVi = makeTranslator(vi, "vi");

describe("translator", () => {
  it("fills in values and leaves unknown placeholders alone", () => {
    expect(tEn("error.reference", { digest: "abc" })).toBe("Reference: abc");
    expect(tVi("time.minutesAgo", { count: 5 })).toBe("5 phút trước");
    expect(tEn("error.reference")).toBe("Reference: {digest}");
  });

  it("has a Vietnamese text for every key, and no empty text", () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
    for (const [key, text] of Object.entries(vi)) expect(text.trim(), key).not.toBe("");
  });

  it("keeps the same placeholders in both languages", () => {
    const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as Array<keyof typeof en>) expect(names(vi[key]), key).toEqual(names(en[key]));
  });
});

describe("patient names", () => {
  it("follow the organization's language, whatever the interface language", () => {
    const thanh = { firstName: "Văn Thành", lastName: "Nguyễn" };
    expect(createFormat(tEn, "vi").patientName(thanh)).toBe("Nguyễn Văn Thành");
    expect(createFormat(tVi, "en").patientName({ firstName: "Maria", lastName: "Gonzalez" })).toBe("Maria Gonzalez");
    // Signed out (no organization): the interface language decides.
    expect(createFormat(tVi).patientName(thanh)).toBe("Nguyễn Văn Thành");
  });
});

describe("language choice", () => {
  it("picks the first supported language from Accept-Language, by quality", () => {
    expect(localeFromAcceptLanguage("vi-VN,vi;q=0.9,en-US;q=0.8")).toBe("vi");
    expect(localeFromAcceptLanguage("fr-FR,en;q=0.5,vi;q=0.7")).toBe("vi");
    expect(localeFromAcceptLanguage("de-DE,fr;q=0.8")).toBeNull();
    expect(localeFromAcceptLanguage(undefined)).toBeNull();
  });
});

describe("dates", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  it("formats dates and relative times in the interface language", () => {
    expect(createFormat(tEn).date("2026-10-31")).toBe("Oct 31, 2026");
    expect(createFormat(tVi).date("2026-10-31")).toMatch(/31.*10.*2026/);
    expect(createFormat(tVi).relative(new Date("2026-10-31T09:00:00Z"), now)).toBe("3 giờ trước");
    expect(createFormat(tEn).relative(new Date("2026-10-31T11:59:30Z"), now)).toBe("just now");
  });
});

describe("server messages", () => {
  it("renders exact and templated server messages in Vietnamese, and wait times too", () => {
    expect(translateServerMessage("Your current password is incorrect.", tVi)).toBe("Mật khẩu hiện tại không đúng.");
    expect(translateServerMessage("You are already a member of Riverside Cancer Center (Demo).", tVi)).toBe(
      "Bạn đã là thành viên của Riverside Cancer Center (Demo).",
    );
    expect(translateServerMessage("Too many sign-in attempts. Try again in 5 minutes.", tVi)).toBe("Đăng nhập sai quá nhiều lần. Hãy thử lại sau 5 phút.");
  });

  it("leaves English untouched and unknown messages as they are", () => {
    expect(translateServerMessage("Your current password is incorrect.", tEn)).toBe("Your current password is incorrect.");
    expect(translateServerMessage("A message nobody translated.", tVi)).toBe("A message nobody translated.");
  });

  /**
   * Every error a service throws with a literal message, and every custom
   * validation message, must have a "server.*" entry, or Vietnamese readers
   * would see English. Template parts (`${...}`) match any placeholder.
   */
  it("covers every message the server code writes", () => {
    const serverRoot = path.resolve(__dirname, "../server");
    const sources = [...listTs(serverRoot), path.resolve(__dirname, "../app/api/cases/[caseId]/documents/route.ts"), path.resolve(__dirname, "../../../../packages/ai/src/errors.ts")];
    const known = new Set(
      (Object.keys(en) as Array<keyof typeof en>).filter((key) => key.startsWith("server.")).map((key) => shape(en[key])),
    );
    const patterns = [
      /new (?:Validation|Forbidden|NotFound|Conflict|RateLimit|PayloadTooLarge|EmailUnavailable|App)Error\(\s*("(?:[^"\\]|\\.)*"|`[^`]*`)/g,
      /\.(?:min|max|email|regex|nonempty)\([^()"`]*?("[^"]+")\s*\)/g,
      /assert(?:Can|ActiveAdmin)\([^;]*?,\s*("[^"]+")\s*\)/g,
      /(?:return|error:|super\()\s*(?:[\w.]+\s*\?\s*)?("[A-Z][^"]{12,}[.!]")/g,
      /(?:const [A-Z_]+ =|userMessage \?\?)\s*("[A-Z][^"]{12,}"|`[A-Z][^`]{12,}`)/g,
      // Permission messages, also inside conditionals.
      /("Only [^"]+\.")/g,
    ];
    const missing: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
          const literal = match[1]!.slice(1, -1);
          // Enum values, permission names ("case.manage") and URLs are not messages.
          if (/^[A-Z_]+$/.test(literal) || /^[a-z]+\.[a-zA-Z]+$/.test(literal) || literal.startsWith("http")) continue;
          if (!known.has(shape(literal))) missing.push(`${path.relative(serverRoot, file)}: ${literal}`);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});

/** Compare texts with every placeholder (`{x}` or `${...}`) reduced to one marker. */
function shape(text: string): string {
  return text.replace(/\$\{[^}]*\}/g, "\u0000").replace(/\{\w+\}/g, "\u0000");
}

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listTs(full);
    return name.endsWith(".ts") && !name.includes(".test.") ? [full] : [];
  });
}
