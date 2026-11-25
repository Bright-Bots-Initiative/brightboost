-- The upper-elementary lab specifications have no playable module of their own.
-- Offer the five shipped, grade-adaptive games as distinct variants instead.
INSERT INTO "ModuleVariant" ("id","familyId","band","version","title","subtitle","status","moduleSlug")
SELECT 'classroom-g35-' || v."id", v."familyId", 'g3_5', 'playable-1', v."title", v."subtitle", 'active', v."moduleSlug"
FROM "ModuleVariant" v JOIN "Module" m ON m."slug" = v."moduleSlug"
WHERE v."band" = 'k2' AND v."version" = '1.0' AND v."status" = 'active'
AND v."moduleSlug" IN ('k2-stem-quantum-quest','k2-stem-rhyme-ride','k2-stem-bounce-buds','k2-stem-gotcha-gears','k2-stem-tank-trek')
ON CONFLICT ("familyId","band","version") DO NOTHING;

-- Data Dash also has its own published upper-elementary module.
UPDATE "ModuleVariant" v SET "moduleSlug" = 'g35-data-dash-sort-discover'
FROM "ModuleFamily" f WHERE f."id" = v."familyId" AND f."key" = 'sorting'
AND v."band" = 'g3_5' AND v."version" = '1.0' AND v."moduleSlug" IS NULL
AND EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'g35-data-dash-sort-discover' AND "published");
