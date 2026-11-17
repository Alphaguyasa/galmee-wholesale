import { addisToday } from "@/lib/daily-cash";
import { statementFileName } from "@/lib/csv";
import { buildStatementExport, checkExportAccess } from "@/server/dal/export";
import { uuidParam } from "@/server/validation";

/** Download one shop's full statement as CSV (any active member of the business). */
export async function GET(_request: Request, { params }: RouteContext<"/api/export/statement/[id]">) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return new Response("Not found", { status: 404 });

  const access = await checkExportAccess("statement");
  if (access === "logged_out") return new Response("Unauthorized", { status: 401 });
  if (access === "not_allowed") return new Response("Forbidden", { status: 403 });

  let body: string | null;
  try {
    body = await buildStatementExport(id);
  } catch {
    return new Response("Export failed", { status: 500 });
  }
  if (body === null) return new Response("Not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${statementFileName(id, addisToday())}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
