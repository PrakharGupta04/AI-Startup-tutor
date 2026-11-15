import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listReflections } from "@/lib/data/reflections";
import { reflectionListSchema } from "@/lib/validation";
import { Card, Badge, ButtonLink } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";
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
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <PageHeader
        title="Class reflections"
        description="Capture, structure, and review cohort learnings and takeaways."
        actions={
          <ButtonLink href="/reflections/new" variant="primary">
            New reflection
          </ButtonLink>
        }
      />

      {/* Scope segmented control */}
      <div className="flex">
        <div className="inline-flex rounded-md p-1 bg-surface border border-line gap-1">
          <Link
            href="/reflections?scope=all"
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              currentScope === "all"
                ? "bg-brand text-white font-medium"
                : "text-ink-muted hover:text-ink hover:bg-canvas"
            }`}
          >
            All reflections
          </Link>
          <Link
            href="/reflections?scope=mine"
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              currentScope === "mine"
                ? "bg-brand text-white font-medium"
                : "text-ink-muted hover:text-ink hover:bg-canvas"
            }`}
          >
            My reflections
          </Link>
        </div>
      </div>

      {/* Reflections list */}
      {items.length === 0 ? (
        <EmptyState
          title="No reflections yet"
          description={
            currentScope === "mine"
              ? "You have not created any reflections yet."
              : "No reflections have been shared yet."
          }
          action={{
            label: "Create a reflection",
            href: "/reflections/new",
          }}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/reflections/${item.id}`}
              className="block group"
            >
              <Card className="hover:border-brand/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-ink group-hover:text-brand transition-colors break-words">
                        {item.sessionTitle}
                      </h2>
                      {item.status === "DRAFT" ? (
                        <Badge variant="neutral">Draft</Badge>
                      ) : (
                        <Badge variant="success">Submitted</Badge>
                      )}
                      {item.aiStructured && (
                        <Badge variant="ai">AI-structured</Badge>
                      )}
                    </div>

                    <div className="text-xs text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={item.authorName} size="sm" />
                        <span className="font-medium text-ink">
                          {item.authorName}
                        </span>
                      </div>
                      <span>•</span>
                      <span>Session date: {item.sessionDate}</span>
                    </div>
                  </div>

                  {item.submittedAt && (
                    <div className="text-xs text-ink-muted sm:text-right shrink-0">
                      Submitted {formatDate(item.submittedAt)}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <p className="text-xs text-ink-muted">
                Showing page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <ButtonLink
                    href={`/reflections?scope=${currentScope}&page=${currentPage - 1}`}
                    variant="secondary"
                    size="sm"
                  >
                    Previous
                  </ButtonLink>
                ) : (
                  <span className="inline-flex items-center justify-center min-h-[32px] px-3 py-1 rounded-md text-xs font-medium border border-line bg-canvas text-ink-subtle cursor-not-allowed">
                    Previous
                  </span>
                )}

                {currentPage < totalPages ? (
                  <ButtonLink
                    href={`/reflections?scope=${currentScope}&page=${currentPage + 1}`}
                    variant="secondary"
                    size="sm"
                  >
                    Next
                  </ButtonLink>
                ) : (
                  <span className="inline-flex items-center justify-center min-h-[32px] px-3 py-1 rounded-md text-xs font-medium border border-line bg-canvas text-ink-subtle cursor-not-allowed">
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
