import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import modulesRouter from "./routes/modules";
import progressRouter from "./routes/progress";
import avatarRouter from "./routes/avatar";
import matchRouter from "./routes/match";
import authRouter from "./routes/auth";
import { devRoleShim, authenticateToken } from "./utils/auth";

const app = express();
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
