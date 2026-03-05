import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "default_dev_secret";

/**
 * Generate a JWT token for a user.
 * Shared utility used by auth routes and class-code login.
 */
export const generateToken = (user: { id: string; role: string }): string => {
  return jwt.sign({ id: user.id, role: user.role }, SESSION_SECRET, {
    expiresIn: "7d",
  });
};
