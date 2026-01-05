import { TFunction } from "i18next";

export type LocalizedField = string | { i18nKey: string } | undefined | null;

export function resolveText(
  t: TFunction,
  field: LocalizedField,
  fallback: string = "",
): string {
  if (typeof field === "string") {
    return field;
  }
  if (field && typeof field === "object" && "i18nKey" in field) {
    return t(field.i18nKey);
  }
  return fallback;
}

export function resolveChoiceList(
  t: TFunction,
  fields: LocalizedField[],
  fallback: string[] = [],
): string[] {
  if (!Array.isArray(fields)) return fallback;
  return fields.map((f) => resolveText(t, f));
}
