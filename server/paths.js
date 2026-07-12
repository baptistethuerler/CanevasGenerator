// server/paths.js
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export function makePaths(root) {
  const data = join(root, "data");
  return {
    root,
    data,
    stories: join(data, "stories"),
    posts: join(data, "posts"),
    templates: join(data, "templates"),
    brand: join(data, "brand.json"),
    images: join(root, "images"),
    logos: join(root, "logos"),
    fonts: join(root, "fonts"),
    exports: join(root, "exports"),
    archives: join(root, "exports", "Archives"),
  };
}

export async function ensureDataDirs(p) {
  for (const dir of [p.stories, p.posts, p.templates, p.images, p.logos, p.fonts, p.exports, p.archives]) {
    await mkdir(dir, { recursive: true });
  }
}
