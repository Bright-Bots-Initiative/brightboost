export const VALID_BANDS = ["K2", "G35"];

export function isValidBand(band: any): boolean {
  return typeof band === "string" && VALID_BANDS.includes(band);
}
