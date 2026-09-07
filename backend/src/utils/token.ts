import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "default_dev_secret";

/**
 * How a session proved who it is (#872). Server-issued inside the signed JWT;
 * routes that change credentials or relationships require `password`.
 *
 * - `password`        email + password verified (login, signup, Pathways
 *                     register / code-login, which verify a bcrypt password)
 * - `class_code`      K-2 icon login without a PIN
 * - `class_code_pin`  K-2 icon login with a verified PIN
 *
 * A token without the claim predates this field ("legacy") and carries no
 * credential authority; ordinary learning routes ignore the claim.
 */
export type SessionAuth = "password" | "class_code" | "class_code_pin";

export const SESSION_AUTH_VALUES: readonly SessionAuth[] = [
  "password",
  "class_code",
  "class_code_pin",
];

export function isSessionAuth(value: unknown): value is SessionAuth {
  return (
    typeof value === "string" &&
    (SESSION_AUTH_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Generate a JWT token for a user.
 * Shared utility used by auth routes and class-code login.
 */
export const generateToken = (
  user: { id: string; role: string },
  auth: SessionAuth,
): string => {
  return jwt.sign({ id: user.id, role: user.role, auth }, SESSION_SECRET, {
    expiresIn: "7d",
  });
};
