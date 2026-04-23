import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import modulesRouter from "./routes/modules";
import progressRouter from "./routes/progress";
import avatarRouter from "./routes/avatar";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import userAvatarRouter from "./routes/userAvatar";
import contextRouter from "./routes/context";
import coursesRouter from "./routes/courses";
import assignmentsRouter from "./routes/assignments";
import pulseRouter from "./routes/pulse";
import teacherPrepRouter from "./routes/teacherPrep";
import resourcesRouter from "./routes/resources";
import pdRouter from "./routes/pd";
import reportsRouter from "./routes/reports";
import classLoginRouter from "./routes/classLogin";
import moduleCatalogRouter from "./routes/moduleCatalog";
import pathwaysRouter from "./routes/pathways";
import studentStatsRouter from "./routes/studentStats";
import feedbackRouter from "./routes/feedback";
import benchmarkRouter from "./routes/benchmarks";
import homeAccessRouter from "./routes/homeAccess";
import experimentsRouter from "./routes/experiments";
import { devRoleShim, authenticateToken } from "./utils/auth";
import { preventHpp, nocache } from "./utils/security";
import { notifySlack } from "./utils/slack";

const app = express();

// Trust proxy is required for rate limiting behind a reverse proxy (like Railway/Vercel)
app.set("trust proxy", 1);

// Security headers
const isProduction = process.env.NODE_ENV === "production";

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
          // 🛡️ Sentinel: Only allow unsafe-inline in dev to prevent XSS
          ...(isProduction ? [] : ["'unsafe-inline'"]),
          "cdn.gpteng.co",
          "quantumai.google",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          "cl-quantum-game.appspot.com",
        ],
        objectSrc: ["'none'"],
        // 🛡️ Sentinel: Add defense in depth
        frameAncestors: ["'none'"], // Prevent Clickjacking
        baseUri: ["'self'"], // Prevent base tag injection
        formAction: ["'self'"], // Restrict form destinations
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // 🛡️ Sentinel: Deny framing to prevent Clickjacking (legacy browsers)
    xFrameOptions: { action: "deny" },
    // 🛡️ Sentinel: Enforce strict HSTS to prevent downgrade attacks
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // 🛡️ Sentinel: Set strict referrer policy to protect privacy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  }),
);

// 🛡️ Sentinel: Add Permissions-Policy header to disable powerful browser features
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
  );
  next();
});

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

// 🛡️ Sentinel: Disable caching for all API routes to protect PII
app.use("/api", nocache);

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
// 🛡️ Sentinel: Enforce strict request body size limit to prevent DoS
app.use(express.json({ limit: "50kb" }));

// Public routes (Auth + Class Login) - Mount before auth middleware to ensure access
app.use("/api", authRouter);
app.use("/api", classLoginRouter);

// Public route for Task Ranker integration
app.use("/context", contextRouter);

// 🛡️ Sentinel: Mount dev shim BEFORE auth token middleware.
// This allows the "mock-token-for-mvp" to be handled by the shim
// without triggering a "jwt malformed" error in authenticateToken.
app.use(devRoleShim);
app.use(authenticateToken);

app.use("/api", modulesRouter);
app.use("/api", progressRouter);
app.use("/api", avatarRouter);
app.use("/api", profileRouter);
app.use("/api", userAvatarRouter);
app.use("/api", coursesRouter);
app.use("/api", moduleCatalogRouter);
app.use("/api", pathwaysRouter);
app.use("/api", assignmentsRouter);
app.use("/api", pulseRouter);
app.use("/api", teacherPrepRouter);
app.use("/api", resourcesRouter);
app.use("/api", pdRouter);
app.use("/api", reportsRouter);
app.use("/api", studentStatsRouter);
app.use("/api", feedbackRouter);
app.use("/api", benchmarkRouter);
app.use("/api", homeAccessRouter);
app.use("/api", experimentsRouter);

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

// Global error-handling middleware (must be after all routes)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Process-level error handlers
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    const commit = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown";
    notifySlack(
      "#deployments",
      `🚀 Bright Boost deployed successfully — commit ${commit}`,
    );
  });
}

export default app;
