import { useLocation } from "react-router-dom";

/** The entry page moves email proofs into this history entry before analytics runs. */
export function useAccountLinkToken(): string {
  const { state, search, hash } = useLocation();
  // Client-side navigation can also arrive without a new document.
  return (
    new URLSearchParams(hash.slice(1)).get("token") ||
    new URLSearchParams(search).get("token") ||
    (typeof state?.accountLinkToken === "string" ? state.accountLinkToken : "")
  );
}
