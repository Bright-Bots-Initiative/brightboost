import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

// All sizes are cold, deduplicated JS + CSS, gzipped locally. Follow static
// imports; a lazy route or game belongs only to the visit that requests it.
export function routeBudgets(appRoot) {
  return {
    name: "brightboost-route-budgets",
    // Other production builds (e.g. the analytics host fixture) also reuse the
    // Vite config. Only the application root contains the routes measured here.
    apply: (config, { command }) =>
      command === "build" && resolve(config.root ?? ".") === appRoot,
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const chunks = Object.values(bundle).filter((e) => e.type === "chunk");
        const source = (id) => id.replaceAll("\\", "/").split("?")[0];
        const owningChunk = (file) => {
          const chunk = chunks.find((c) =>
            c.moduleIds.some((id) => source(id).endsWith("/src/" + file)),
          );
          if (!chunk) throw new Error("Missing measured module: " + file);
          return chunk.fileName;
        };
        const entry = owningChunk("main.tsx");
        // bootstrap unconditionally requests these dynamic imports before rendering App.
        const boot = [entry, ...bundle[entry].dynamicImports];
        const routes = [
          ["startup", [], 390],
          ["landing", ["pages/Index.tsx"], 410],
          ["student login", ["pages/LoginSelection.tsx"], 400],
          ["class login", ["pages/StudentClassLogin.tsx"], 400],
          ["teacher login", ["pages/TeacherLogin.tsx"], 400],
          [
            "activity before game",
            ["layouts/StudentLayout.tsx", "pages/ActivityPlayer.tsx"],
            455,
          ],
        ];
        const sizes = new Map();
        for (const [name, files, limit] of routes) {
          const seen = new Set();
          let bytes = 0;
          const visit = (file) => {
            if (seen.has(file)) return;
            seen.add(file);
            const item = bundle[file];
            if (!item) throw new Error("Missing route asset: " + file);
            if (!sizes.has(file))
              sizes.set(
                file,
                gzipSync(item.type === "chunk" ? item.code : item.source, {
                  level: 9,
                }).length,
              );
            bytes += sizes.get(file);
            if (item.type !== "chunk") return;
            for (const id of item.moduleIds.map(source)) {
              if (
                /\/src\/(?:components\/(?:TeacherDashboard|admin|pathways\/facilitator)\/|pages\/(?:AdminMetrics|Waterworks|BiomeBuddy(?:Share|Review)?|Teacher(?:Dashboard|Classes|ClassDetail|Gallery|Resources|StudentRoster))\.tsx$|components\/games\/(?:[^/]*\/)*[^/]+Game\.tsx$)/.test(
                  id,
                )
              ) {
                throw new Error(
                  `ROUTE_BOUNDARY: ${name} loads ${id.split("/src/")[1]}`,
                );
              }
            }
            item.imports.forEach(visit);
            item.viteMetadata?.importedCss.forEach(visit);
          };
          [...boot, ...files.map(owningChunk)].forEach(visit);
          const kib = (bytes / 1024).toFixed(1);
          if (bytes > limit * 1024)
            throw new Error(
              `ROUTE_BUDGET: ${name} ${kib} KiB exceeds ${limit} KiB`,
            );
          console.log(`[route budget] ${name}: ${kib} / ${limit} KiB gzip`);
        }
      },
    },
  };
}
