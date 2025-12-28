import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import modulesRouter from "./routes/modules";
import progressRouter from "./routes/progress";
import avatarRouter from "./routes/avatar";
import matchRouter from "./routes/match";
import authRouter from "./routes/auth";
import { devRoleShim, authenticateToken } from "./utils/auth";

const app = express();

// Trust proxy is required for rate limiting behind a reverse proxy (like Railway/Vercel)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiting to all API routes - BEFORE body parsing
app.use("/api", apiLimiter);

app.use(cors());
app.use(express.json());

// Public routes (Auth) - Mount before auth middleware to ensure access
app.use("/api", authRouter);

// 🛡️ Sentinel: Mount dev shim BEFORE auth token middleware.
// This allows the "mock-token-for-mvp" to be handled by the shim
// without triggering a "jwt malformed" error in authenticateToken.
app.use(devRoleShim);
app.use(authenticateToken);

app.use("/api", modulesRouter);
app.use("/api", progressRouter);
app.use("/api", avatarRouter);
app.use("/api", matchRouter);

app.get("/health", (_req: Request, res: Response) =>
  res.status(200).json({ status: "ok" })
);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
