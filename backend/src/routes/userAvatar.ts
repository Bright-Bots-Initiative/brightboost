// backend/src/routes/userAvatar.ts
import { Router, Request, Response } from "express";
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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 300 * 1024, // 300KB limit
  },
});

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
 * POST /user/avatar/upload
 * Upload avatar as multipart form data, convert to base64 data URL
 */
router.post(
  "/user/avatar/upload",
  requireAuth,
  sensitiveOpsLimiter,
  upload.single("avatar"),
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
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Maximum size is 300KB." });
        }
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
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
