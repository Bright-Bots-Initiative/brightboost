// backend/src/routes/userAvatar.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";
import { logAudit } from "../utils/audit";
import { sensitiveOpsLimiter } from "../utils/security";

const router = Router();

// Multer configuration: memory storage for base64 conversion
const storage = multer.memoryStorage();

// File filter: only allow specific image types
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ["image/webp", "image/png", "image/jpeg"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only WebP, PNG, and JPEG are allowed."));
  }
};

// #881 (DEP-01): the byte limit alone bounds only the file. A single request
// can still carry unlimited fields, parts and header pairs, and a deeply
// nested field name costs CPU before any handler runs. This route consumes
// exactly one part - the `avatar` file - so every other dimension is bounded
// to what the client actually sends and rejected by busboy before buffering.
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 300 * 1024, // 300KB limit
    files: 1,
    fields: 0,
    // busboy emits `partsLimit` when the counter *reaches* this value
    // (`if (++parts === partsLimit)`), unlike `files`/`fields`, which reject
    // the part that would exceed them. 2 is therefore the value that admits
    // exactly one part and stops the parser on a second. AV-1 guards it.
    parts: 2,
    fieldNameSize: 100,
    fieldSize: 1024,
    headerPairs: 20,
  },
});

// Stable, user-facing text for each bound. Multer's own messages are internal
// strings; mapping them keeps the response contract independent of the library
// and keeps the wording at the K-2 reading bar.
const UPLOAD_LIMIT_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: "File too large. Maximum size is 300KB.",
  LIMIT_FILE_COUNT: "Too many files. Upload one avatar image.",
  LIMIT_PART_COUNT: "Too many form parts. Upload one avatar image.",
  LIMIT_FIELD_COUNT: "Unexpected form fields. Upload one avatar image.",
  LIMIT_FIELD_KEY: "Form field name is too long.",
  LIMIT_FIELD_VALUE: "Form field value is too long.",
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field. Use the "avatar" field.',
};

// Validation schema for PATCH avatar URL
const patchAvatarSchema = z.object({
  avatarUrl: z
    .string()
    .max(500000, "Avatar URL too large") // Allow base64 data URLs
    .refine(
      (url) =>
        url.startsWith("data:image/") ||
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("/"),
      "Invalid avatar URL format",
    ),
});

/**
 * Multer wrapper that catches multer errors and returns proper JSON 400s
 * instead of letting them fall through to the global 500 handler.
 */
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("avatar")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: UPLOAD_LIMIT_MESSAGES[err.code] ?? err.message,
        code: err.code,
      });
    }
    if (err) {
      return res
        .status(400)
        .json({ error: err.message || "Invalid file upload" });
    }
    next();
  });
}

/**
 * POST /user/avatar/upload
 * Upload avatar as multipart form data, convert to base64 data URL
 */
router.post(
  "/user/avatar/upload",
  requireAuth,
  sensitiveOpsLimiter,
  handleUpload,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert buffer to base64 data URL
      const base64 = req.file.buffer.toString("base64");
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

      // Update user's avatar URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: dataUrl },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      });

      await logAudit("AVATAR_UPLOAD", userId, {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      res.json({
        success: true,
        avatarUrl: updatedUser.avatarUrl,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl,
        },
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * PATCH /user/avatar
 * Update avatar URL directly (for external storage like S3)
 */
router.patch(
  "/user/avatar",
  requireAuth,
  sensitiveOpsLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const data = patchAvatarSchema.parse(req.body);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: data.avatarUrl },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      });

      await logAudit("AVATAR_UPDATE", userId, {
        urlLength: data.avatarUrl.length,
      });

      res.json({
        success: true,
        avatarUrl: updatedUser.avatarUrl,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Avatar update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * DELETE /user/avatar
 * Reset avatar to default (null)
 */
router.delete(
  "/user/avatar",
  requireAuth,
  sensitiveOpsLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      });

      await logAudit("AVATAR_DELETE", userId, {});

      res.json({
        success: true,
        avatarUrl: null,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl,
        },
      });
    } catch (error) {
      console.error("Avatar delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
