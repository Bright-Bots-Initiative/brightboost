import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/locales/en/common.json";

const root = path.resolve(__dirname, "../../..");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const imageUrl = "https://brightboost.org/bright-boost-share-v2.png";

describe("static share metadata before JavaScript", () => {
  const parse = () => new DOMParser().parseFromString(html, "text/html");

  it("keeps the static title and description byte-identical to English home copy", () => {
    const doc = parse();
    expect(doc.title).toBe(en.home.meta.title);
    expect(
      doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(en.home.meta.description);
    expect(doc.querySelectorAll("title")).toHaveLength(1);
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it.each([
    ["property", "og:title", en.home.meta.title],
    ["property", "og:description", en.home.meta.description],
    ["property", "og:url", "https://brightboost.org/"],
    ["property", "og:type", "website"],
    ["property", "og:image", imageUrl],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "630"],
    [
      "property",
      "og:image:alt",
      "Bright Boost mascot beside the words A world you build by learning.",
    ],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:image", imageUrl],
    ["name", "twitter:title", en.home.meta.title],
    ["name", "twitter:description", en.home.meta.description],
    [
      "name",
      "twitter:image:alt",
      "Bright Boost mascot beside the words A world you build by learning.",
    ],
  ])("ships exactly one %s=%s tag", (attribute, name, content) => {
    const tags = parse().querySelectorAll(`meta[${attribute}="${name}"]`);
    expect(tags).toHaveLength(1);
    expect(tags[0].getAttribute("content")).toBe(content);
  });

  it("ships a production canonical without a query or fragment", () => {
    const tags = parse().querySelectorAll('link[rel="canonical"]');
    expect(tags).toHaveLength(1);
    expect(tags[0].getAttribute("href")).toBe("https://brightboost.org/");
  });

  it("points to a real 1200 × 630 PNG", () => {
    const png = readFileSync(
      path.join(root, "public/bright-boost-share-v2.png"),
    );
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
});
