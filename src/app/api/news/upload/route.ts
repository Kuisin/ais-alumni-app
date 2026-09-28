import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  isAttachmentKey,
} from "@/lib/news-hub";
import { actionNewsAuthor } from "@/lib/session";
import { isBlobConfigured } from "@/lib/storage";

/**
 * Token endpoint for ニュース authors → Vercel Blob uploads of ニュース attachments
 * (≤10 MB; function bodies are capped at 4.5 MB). Rows are created when the
 * post is saved, which re-checks each key.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isBlobConfigured())
    return Response.json({ error: "not_configured" }, { status: 404 });
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (body?.type !== "blob.generate-client-token")
    return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await actionNewsAuthor().catch(() => null)))
          throw new Error("forbidden");
        if (!isAttachmentKey(pathname)) throw new Error("forbidden");
        return {
          allowedContentTypes: [...ATTACHMENT_TYPES],
          maximumSizeInBytes: ATTACHMENT_MAX_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    const forbidden = e instanceof Error && e.message === "forbidden";
    return Response.json(
      { error: forbidden ? "forbidden" : "upload_failed" },
      { status: forbidden ? 403 : 400 },
    );
  }
}
