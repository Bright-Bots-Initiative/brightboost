import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireRole } from "../utils/auth";

const router = Router();

// GET /api/teacher/resources — List resources with optional filters
router.get(
  "/teacher/resources",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const { moduleSlug, type, category } = req.query;

      const where: Record<string, unknown> = {};
      if (moduleSlug && moduleSlug !== "all") {
        where.moduleSlug = moduleSlug === "general" ? null : String(moduleSlug);
      }
      if (type && type !== "all") where.type = String(type);
      if (category && category !== "all") where.category = String(category);

      const resources = await prisma.resource.findMany({
        where,
        orderBy: [{ moduleSlug: "asc" }, { category: "asc" }, { title: "asc" }],
      });

      res.json(resources);
    } catch (err) {
      console.error("Error fetching resources:", err);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  },
);

// GET /api/teacher/resources/:id — Get single resource
router.get(
  "/teacher/resources/:id",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: req.params.id },
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json(resource);
    } catch (err) {
      console.error("Error fetching resource:", err);
      res.status(500).json({ error: "Failed to fetch resource" });
    }
  },
);

// GET /api/teacher/resources/:id/print — Get print-friendly version
router.get(
  "/teacher/resources/:id/print",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: req.params.id },
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (!resource.contentHtml) {
        return res.status(400).json({ error: "Resource has no printable content" });
      }

      // Return print-friendly HTML page
      const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resource.title} - BrightBoost</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0.75in; color: #1a1a2e; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; }
    .header h1 { font-size: 22px; color: #1a1a2e; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; color: #6b7280; }
    .header .logo { font-size: 14px; font-weight: bold; color: #3b82f6; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 20px 0 8px; color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 14px 0 6px; color: #374151; }
    p, li { font-size: 13px; }
    ul, ol { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    .worksheet-area { border: 1px dashed #d1d5db; padding: 24px; margin: 12px 0; min-height: 100px; border-radius: 4px; }
    .line { border-bottom: 1px solid #d1d5db; margin: 16px 0; min-height: 28px; }
    .name-date { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
    .name-date span { border-bottom: 1px solid #1a1a2e; min-width: 200px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td, th { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: left; }
    @media print {
      body { padding: 0.5in; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Bright Boost</div>
    <h1>${resource.title}</h1>
    <div class="subtitle">${resource.description}</div>
  </div>
  <div class="name-date">
    <div>Name: <span>&nbsp;</span></div>
    <div>Date: <span>&nbsp;</span></div>
  </div>
  ${resource.contentHtml}
  <script class="no-print">
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html");
      res.send(printHtml);
    } catch (err) {
      console.error("Error fetching printable resource:", err);
      res.status(500).json({ error: "Failed to generate printable version" });
    }
  },
);

export default router;
