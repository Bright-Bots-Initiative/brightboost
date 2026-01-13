import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import modulesRouter from "./routes/modules";
import progressRouter from "./routes/progress";
import avatarRouter from "./routes/avatar";
import matchRouter from "./routes/match";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import { devRoleShim, authenticateToken } from "./utils/auth";
import { preventHpp } from "./utils/security";

const app = express();

// Trust proxy is required for rate limiting behind a reverse proxy (like Railway/Vercel)
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "cdn.gpteng.co",
          "api.dicebear.com",
          "stub-bucket.s3.amazonaws.com",
          "quantumai.google",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Needed for Vite/React inline scripts
          "cdn.gpteng.co",
          "quantumai.google",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          "bb-dev-func.azurewebsites.net",
          "cl-quantum-game.appspot.com",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ⚡ Bolt Optimization: Enable gzip compression
// Reduces payload size by 70-90% for JSON APIs and static assets
app.use(compression());

// 🛡️ Sentinel: Prevent HTTP Parameter Pollution (HPP)
// Flattens repeated query parameters to the last value to prevent logic bypass
app.use(preventHpp);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiting to all API routes - BEFORE body parsing
app.use("/api", apiLimiter);

// 🛡️ Sentinel: Configure CORS securely
// Only allow trusted origins in production to prevent unauthorized access
const defaultAllowedOrigins = [
  "https://fe-production-3552.up.railway.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const envAllowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  process.env.FRONTEND_ORIGIN ||
  process.env.ALLOWED_ORIGINS ||
  ""
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...defaultAllowedOrigins, ...envAllowedOrigins];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Explicitly reject unknown origins with logging
    console.error(`[CORS BLOCKED] origin: ${origin}`, {
      allowedOrigins,
      nodeEnv: process.env.NODE_ENV,
    });
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
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
app.use("/api", profileRouter);

app.get("/health", (_req: Request, res: Response) =>
  res.status(200).json({ status: "ok" }),
);

// Serve static frontend files
// In production (dist/src/server.js), the frontend build is in ../../../dist
// In development (src/server.ts), the frontend build is in ../../dist
const distPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === "production" ? "../../../dist" : "../../dist",
);

const serveFrontend =
  process.env.SERVE_FRONTEND === "true" &&
  process.env.NODE_ENV === "production";

let frontendServed = false;

if (serveFrontend) {
  if (fs.existsSync(path.join(distPath, "index.html"))) {
    app.use(express.static(distPath));

    // SPA Fallback
    app.get(/(.*)/, (req, res) => {
      if (req.path.startsWith("/api")) return res.status(404).end();
      res.sendFile(path.join(distPath, "index.html"));
    });
    frontendServed = true;
  } else {
    console.warn(
      "[WARN] SERVE_FRONTEND=true but dist/index.html missing; running API-only.",
    );
  }
}

if (!frontendServed) {
  app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "backend" });
  });
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
