import type { UserRole } from "../utils/auth";
import type { SessionAuth } from "../utils/token";

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated identity. `auth` is the session provenance claim from
       * the JWT (#872); undefined for legacy tokens and dev-shim identities.
       */
      user?: { id: string; role: UserRole; auth?: SessionAuth } | null;
    }
  }
}

export {};
