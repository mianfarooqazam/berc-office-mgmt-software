import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function saveUpload(file: File, folder = "general") {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File exceeds 10MB limit");
  }

  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });

  const safe = sanitizeName(file.name || "file");
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
  const relative = path.join(folder, filename).replace(/\\/g, "/");
  const absolute = path.join(UPLOAD_ROOT, relative);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolute, buffer);

  return {
    filePath: relative,
    mimeType: file.type,
    size: file.size,
    name: file.name,
  };
}

export async function readUpload(relativePath: string) {
  const absolute = path.join(UPLOAD_ROOT, relativePath);
  if (!absolute.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid path");
  }
  return readFile(absolute);
}

export async function deleteUpload(relativePath: string) {
  const absolute = path.join(UPLOAD_ROOT, relativePath);
  if (!absolute.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(absolute);
  } catch {
    /* ignore */
  }
}

export function absoluteUploadPath(relativePath: string) {
  return path.join(UPLOAD_ROOT, relativePath);
}
