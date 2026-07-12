import { readdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;
const SAFE_REF = /^[a-zA-Z0-9._-]+$/;

export function createAssets(p) {
  return {
    async list() {
      let files = [];
      try { files = await readdir(p.images); } catch { files = []; }
      return files.filter((f) => IMG_RE.test(f)).map((ref) => ({ ref, url: `/images/${ref}` }));
    },
    async save(dataUrl) {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || "");
      if (!match) throw new Error("dataUrl invalide");
      const ext = EXT_BY_MIME[match[1].toLowerCase()];
      if (!ext) throw new Error("type d'image non supporté");
      const ref = `${randomUUID()}.${ext}`;
      await writeFile(join(p.images, ref), Buffer.from(match[2], "base64"));
      return { ref, url: `/images/${ref}` };
    },
    async remove(ref) {
      if (!SAFE_REF.test(ref)) throw new Error("ref invalide");
      await unlink(join(p.images, ref));
    },
  };
}
