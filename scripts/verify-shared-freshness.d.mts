export interface FreshnessVerdict {
  ok: boolean;
  files?: number;
  backend?: string;
  findings: string[];
}
export function verifySharedFreshness(
  root: string,
  options?: { compiler?: string; requireBackend?: boolean },
): FreshnessVerdict;
