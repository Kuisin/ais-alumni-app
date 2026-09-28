import { isAuthorizedCron } from "@/lib/cron";
import { isJobName, runDueJobs, runJob } from "@/lib/jobs";

export const maxDuration = 300;

/**
 * The one cron endpoint (src/lib/jobs): Supabase pg_cron calls it every
 * minute to run whatever is due. ?task=<name> runs that task now.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const task = new URL(request.url).searchParams.get("task");
  if (task === null)
    return Response.json({
      ok: true,
      ranAt: now.toISOString(),
      tasks: await runDueJobs(now),
    });
  if (!isJobName(task)) return new Response("Unknown task", { status: 404 });
  const outcome = await runJob(task, now);
  if ("error" in outcome)
    return Response.json(
      { ok: false, task, ranAt: now.toISOString(), error: outcome.error },
      { status: 500 },
    );
  return Response.json({
    ok: true,
    task,
    ranAt: now.toISOString(),
    ...(outcome.result as object),
  });
}
