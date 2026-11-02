import { Fragment, type ReactNode } from "react";

/**
 * A translated text with elements in it: `rich(t("reset.for"), { email: <b>{email}</b> })`.
 * The translator leaves unfilled `{name}` placeholders in place, so pass the
 * template through t() without these values. Works in server and client components.
 */
export function rich(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/\{(\w+)\}/g).map((part, index) =>
    index % 2 === 0 ? part : <Fragment key={index}>{Object.hasOwn(values, part) ? values[part] : `{${part}}`}</Fragment>,
  );
}
