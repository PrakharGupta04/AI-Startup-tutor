import { requireInstructor } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listAllNews } from "@/lib/data/news";
import { newsListSchema } from "@/lib/validation";
import { NEWS_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, Badge, ButtonLink } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const instant = false;

interface ManageNewsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManageNewsPage(props: ManageNewsPageProps) {
  const instructor = await requireInstructor();
  const searchParams = await props.searchParams;

  const rawPage =
    typeof searchParams.page === "string" ? searchParams.page : undefined;

  const parsed = newsListSchema.parse({
    page: rawPage,
  });

  const { items, total, pageSize } = await listAllNews(
    getDb(),
    instructor,
    parsed
  );

  const currentPage = parsed.page;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function makeUrl(targetPage: number) {
    if (targetPage <= 1) return "/news/manage";
    return `/news/manage?page=${targetPage}`;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <PageHeader
        title="Manage news"
        description="Create, edit, AI-summarize, and publish corporate–startup collaboration news."
        actions={
          <ButtonLink href="/news/manage/new" variant="primary">
            New item
          </ButtonLink>
        }
      />

      {/* Item list or empty state */}
      {items.length === 0 ? (
        <EmptyState
          title="No news items yet."
          description="Create your first news item by adding article text, generating summaries, and publishing."
          action={{
            label: "Create new item",
            href: "/news/manage/new",
          }}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const categoryLabel =
              NEWS_CATEGORY_LABELS[item.category] ?? item.category;

            return (
              <Card key={item.id} className="hover:border-brand/40 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="neutral">{categoryLabel}</Badge>
                      {item.status === "PUBLISHED" ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                      {item.aiAssisted && (
                        <Badge variant="ai">AI-assisted</Badge>
                      )}
                    </div>

                    <h2 className="text-base font-semibold text-ink leading-snug">
                      {item.headline}
                    </h2>

                    <div className="text-xs text-ink-muted flex items-center gap-2 flex-wrap">
                      <span>Updated {formatDate(item.updatedAt)}</span>
                      <span>·</span>
                      <span>Created by {item.createdByName}</span>
                      {item.publishedOn && (
                        <>
                          <span>·</span>
                          <span>Dated {formatDate(item.publishedOn)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center self-start shrink-0">
                    <ButtonLink
                      href={`/news/manage/${item.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-line text-xs text-ink-muted">
              <div>
                Page {currentPage} of {totalPages} ({total} total)
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <ButtonLink
                    href={makeUrl(currentPage - 1)}
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
                    href={makeUrl(currentPage + 1)}
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
