import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listReflections } from "@/lib/data/reflections";
import { reflectionListSchema } from "@/lib/validation";
import { Card, Badge } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";

export const instant = false;

interface ReflectionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReflectionsPage(props: ReflectionsPageProps) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const rawPage =
    typeof searchParams.page === "string" ? searchParams.page : undefined;
  const rawScope =
    typeof searchParams.scope === "string" ? searchParams.scope : undefined;

  const parsed = reflectionListSchema.parse({
    page: rawPage,
    scope: rawScope,
  });

  const { items, total, pageSize } = await listReflections(
    getDb(),
    user,
    parsed
  );

  const currentPage = parsed.page;
  const currentScope = parsed.scope;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Class reflections
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Capture, structure, and review cohort learnings and takeaways.
          </p>
        </div>
        <div>
          <Link
            href="/reflections/new"
            className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New reflection
          </Link>
        </div>
      </div>

      {/* Scope navigation */}
      <div className="flex border-b border-slate-200">
        <Link
          href={`/reflections?scope=all`}
          className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            currentScope === "all"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          All
        </Link>
        <Link
          href={`/reflections?scope=mine`}
          className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            currentScope === "mine"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Mine
        </Link>
      </div>

      {/* Reflections list */}
      {items.length === 0 ? (
        <EmptyState
          title="No reflections yet"
          description={
            currentScope === "mine"
              ? "You haven't created any reflections yet."
              : "No reflections have been shared yet."
          }
          action={{
            label: "Create a reflection",
            href: "/reflections/new",
          }}
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="hover:border-slate-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-900 break-words">
                      {item.sessionTitle}
                    </h2>
                    {item.status === "DRAFT" ? (
                      <Badge variant="warning">Draft</Badge>
                    ) : (
                      <Badge variant="success">Submitted</Badge>
                    )}
                    {item.aiStructured && (
                      <Badge variant="info">AI-structured</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Session date:{" "}
                      <span className="font-medium text-slate-700">
                        {item.sessionDate}
                      </span>
                    </span>
                    <span>•</span>
                    <span>
                      Author:{" "}
                      <span className="font-medium text-slate-700">
                        {item.authorName}
                      </span>
                    </span>
                    {item.submittedAt && (
                      <>
                        <span>•</span>
                        <span>
                          Submitted:{" "}
                          <span className="font-medium text-slate-700">
                            {formatDate(item.submittedAt)}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="self-start sm:self-center shrink-0">
                  <Link
                    href={`/reflections/${item.id}`}
                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    View
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Showing page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={`/reflections?scope=${currentScope}&page=${currentPage - 1}`}
                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed">
                    Previous
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={`/reflections?scope=${currentScope}&page=${currentPage + 1}`}
                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed">
                    Next
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
