import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { AccountState } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/session";
import { isBlobConfigured } from "@/lib/storage";
import { evidencePrefix, isOwnEvidenceKey } from "@/lib/verification/evidence";
import { EVIDENCE_MAX_BYTES, EVIDENCE_TYPES } from "@/lib/verification/schema";

/**
 * Token endpoint for browser → Vercel Blob evidence uploads (§6.3). Function
 * bodies on Vercel are capped at 4.5 MB, so files (≤10 MB) go directly to
 * Blob; this route only authorizes the upload. Rows are created when the
 * verification form is submitted (the submit action re-checks each key), so
 * no onUploadCompleted callback is needed.
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
  // Only token generation is accepted; completion webhooks are not used.
  if (body?.type !== "blob.generate-client-token") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (
          !user ||
          (user.state !== AccountState.EMAIL_VERIFIED &&
            user.state !== AccountState.NEEDS_INFO)
        ) {
          throw new Error("forbidden");
        }
        if (
          !isOwnEvidenceKey(user.id, pathname) ||
          pathname === evidencePrefix(user.id)
        ) {
          throw new Error("forbidden");
        }
        return {
          allowedContentTypes: [...EVIDENCE_TYPES],
          maximumSizeInBytes: EVIDENCE_MAX_BYTES,
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
