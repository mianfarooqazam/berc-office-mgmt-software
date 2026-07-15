import { readUpload } from "@/lib/storage";
import { requireAuth, error } from "@/lib/api";

type Ctx = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
};

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { path: parts } = await ctx.params;
  const relative = parts.join("/");
  try {
    const data = await readUpload(relative);
    const ext = relative.split(".").pop()?.toLowerCase() || "";
    return new Response(data, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${parts[parts.length - 1]}"`,
      },
    });
  } catch {
    return error("File not found", 404);
  }
}
