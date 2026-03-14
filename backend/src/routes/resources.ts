import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireRole } from "../utils/auth";

const router = Router();

// ── Branded print shell ──────────────────────────────────────────────────────
// Single reusable template for all printable resource types (WORKSHEET, GUIDE,
// HANDOUT).  Inline SVG wordmark avoids external asset dependencies.

const BRAND_NAVY = "#1C3D6C";
const BRAND_BLUE = "#46B1E6";

/** Inline SVG wordmark: small gear icon + "BrightBoost" text.  Grayscale-safe. */
const BRAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 32" height="32" aria-label="BrightBoost">
  <!-- gear icon -->
  <g transform="translate(16,16)">
    <circle cx="0" cy="0" r="6" fill="none" stroke="${BRAND_NAVY}" stroke-width="2"/>
    <circle cx="0" cy="0" r="2.5" fill="${BRAND_BLUE}"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="-1.5" y="-11" width="3" height="5" rx="1" fill="${BRAND_NAVY}" transform="rotate(${a})"/>`).join("")}
  </g>
  <!-- wordmark -->
  <text x="36" y="22" font-family="Montserrat,'Segoe UI',Arial,sans-serif" font-size="18" font-weight="700" fill="${BRAND_NAVY}">Bright</text><text x="109" y="22" font-family="Montserrat,'Segoe UI',Arial,sans-serif" font-size="18" font-weight="700" fill="${BRAND_BLUE}">Boost</text>
</svg>`;

interface PrintableResource {
  title: string;
  description: string;
  type: string;
  contentHtml: string;
}

function buildPrintHtml(resource: PrintableResource): string {
  const descriptionBlock = resource.description
    ? `\n    <div class="subtitle">${resource.description}</div>`
    : "";

  const nameDateBlock =
    resource.type === "WORKSHEET"
      ? `\n  <div class="name-date">
    <div>Name: <span>&nbsp;</span></div>
    <div>Date: <span>&nbsp;</span></div>
  </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resource.title} - BrightBoost</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0.75in; padding-bottom: 1.1in; color: #1a1a2e; line-height: 1.6; }

    /* ── Header ─────────────────────────────────────────── */
    .print-header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2.5px solid ${BRAND_NAVY}; }
    .print-header svg { display: inline-block; margin-bottom: 8px; }
    .print-header h1 { font-size: 21px; color: ${BRAND_NAVY}; margin-bottom: 2px; line-height: 1.3; }
    .print-header .subtitle { font-size: 12px; color: #6b7280; line-height: 1.4; margin-top: 4px; }

    /* ── Name / Date ────────────────────────────────────── */
    .name-date { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
    .name-date span { border-bottom: 1px solid ${BRAND_NAVY}; min-width: 200px; display: inline-block; }

    /* ── Content ─────────────────────────────────────────── */
    h2 { font-size: 16px; margin: 20px 0 8px; color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 14px 0 6px; color: #374151; }
    p, li { font-size: 13px; }
    ul, ol { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    .worksheet-area { border: 1px dashed #d1d5db; padding: 24px; margin: 12px 0; min-height: 100px; border-radius: 4px; }
    .line { border-bottom: 1px solid #d1d5db; margin: 16px 0; min-height: 28px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td, th { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: left; }

    /* ── K-2 worksheet overrides ─────────────────────────── */
    .k2-worksheet h2 { font-size: 22px; margin: 24px 0 10px; }
    .k2-worksheet h3 { font-size: 18px; margin: 18px 0 8px; }
    .k2-worksheet p, .k2-worksheet li { font-size: 18px; line-height: 1.7; }
    .k2-worksheet .worksheet-area { min-height: 180px; padding: 28px; }
    .k2-worksheet .line { min-height: 40px; margin: 20px 0; }
    .k2-worksheet td, .k2-worksheet th { padding: 14px; font-size: 18px; }
    .k2-worksheet .match-table td { border: none; padding: 12px 24px; font-size: 20px; }

    /* ── Footer ──────────────────────────────────────────── */
    .print-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #9ca3af; padding: 8px 0.5in; border-top: 1px solid #e5e7eb; background: #fff; }

    @media print {
      body { padding: 0.5in; padding-bottom: 0.9in; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    ${BRAND_SVG}
    <h1>${resource.title}</h1>${descriptionBlock}
  </div>${nameDateBlock}
  ${resource.contentHtml}
  <div class="print-footer">BrightBoost &mdash; Bright Bots Initiative</div>
  <script class="no-print">
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

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

      const printHtml = buildPrintHtml({
        title: resource.title,
        description: resource.description,
        type: resource.type,
        contentHtml: resource.contentHtml,
      });

      res.setHeader("Content-Type", "text/html");
      res.send(printHtml);
    } catch (err) {
      console.error("Error fetching printable resource:", err);
      res.status(500).json({ error: "Failed to generate printable version" });
    }
  },
);

export default router;
