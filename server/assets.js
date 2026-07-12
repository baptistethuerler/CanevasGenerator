import { readdir, writeFile, unlink, copyFile, access } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;
const SAFE_REF = /^[a-zA-Z0-9._-]+$/;

// syncFrom : dossier « dépôt » (ex. fonds/) dont les images sont importées dans dir avant chaque listing.
export function createAssets(dir, urlBase, syncFrom = null) {
  const importNew = async () => {
    if (!syncFrom) return;
    let files = [];
    try { files = await readdir(syncFrom); } catch { return; }
    for (const f of files) {
      if (!IMG_RE.test(f)) continue;
      const dest = join(dir, f);
      try { await access(dest); continue; } catch { /* absent → on copie */ }
      try { await copyFile(join(syncFrom, f), dest); } catch { /* ignoré */ }
    }
  };
  return {
    async list() {
      await importNew();
      let files = [];
      try { files = await readdir(dir); } catch { files = []; }
      return files.filter((f) => IMG_RE.test(f)).map((ref) => ({ ref, url: `${urlBase}/${ref}` }));
    },
    async save(dataUrl) {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || "");
      if (!match) throw new Error("dataUrl invalide");
      const ext = EXT_BY_MIME[match[1].toLowerCase()];
      if (!ext) throw new Error("type d'image non supporté");
      const ref = `${randomUUID()}.${ext}`;
      await writeFile(join(dir, ref), Buffer.from(match[2], "base64"));
      return { ref, url: `${urlBase}/${ref}` };
    },
    async remove(ref) {
      if (!SAFE_REF.test(ref)) throw new Error("ref invalide");
      await unlink(join(dir, ref));
    },
  };
}
