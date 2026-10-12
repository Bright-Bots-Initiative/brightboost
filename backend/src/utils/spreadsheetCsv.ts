/**
 * CSV for human spreadsheet viewing (#886), not a lossless interchange API.
 * Quotes alone do not prevent formulas. Put an apostrophe + tab inside the
 * quoted field for formula-shaped text: the apostrophe marks text in common
 * importers; the tab remains protective if Excel consumes the apostrophe.
 * Inspect past whitespace/control/format characters and existing text markers.
 * Preserve the original value; this only changes the exported representation.
 * https://owasp.org/www-community/attacks/CSV_Injection
 */
export function spreadsheetCsvCell(value: string): string {
  const formula = /^[\s\p{Cc}\p{Cf}']*[=+\-@＝＋－＠]/u.test(value);
  const text = formula ? `'\t${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}
