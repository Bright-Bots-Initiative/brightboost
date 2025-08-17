import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy staticwebapp.config.json to dist directory
console.log("Copying staticwebapp.config.json to dist directory...");
fs.copyFileSync(
  path.resolve(__dirname, "staticwebapp.config.json"),
  path.resolve(__dirname, "dist", "staticwebapp.config.json"),
);
console.log("Copy complete!");
