import { addisToday } from "@/lib/daily-cash";
import { exportFileName, isExportKind } from "@/lib/csv";
import { buildExport, checkExportAccess } from "@/server/dal/export";

/** Download one part of the business's book as CSV (owner or manager). */
export async function GET(_request: Request, { params }: RouteContext<"/api/export/[kind]">) {
  const { kind } = await params;
  if (!isExportKind(kind)) return new Response("Not found", { status: 404 });

  const access = await checkExportAccess();
  if (access === "logged_out") return new Response("Unauthorized", { status: 401 });
  if (access === "not_allowed") return new Response("Forbidden", { status: 403 });

  let body: string;
  try {
    body = await buildExport(kind);
  } catch {
    return new Response("Export failed", { status: 500 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(kind, addisToday())}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
