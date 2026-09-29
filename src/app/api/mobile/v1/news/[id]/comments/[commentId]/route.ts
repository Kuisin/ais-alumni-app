import { deleteCommentAction } from "@/app/actions/news-hub";
import { IdParam, mobileRoute, notFound } from "@/lib/mobile/http";
import { hubResponse, requireCommentOnPost } from "@/lib/mobile/news";

/** Delete a comment: members their own, admins any (the action decides). */
export const DELETE = mobileRoute<{ id: string; commentId: string }>(
  async ({ params }) => {
    const commentId = IdParam.safeParse(params.commentId);
    if (!commentId.success) throw notFound();
    await requireCommentOnPost(params.id, commentId.data);
    return hubResponse(await deleteCommentAction(commentId.data));
  },
);
