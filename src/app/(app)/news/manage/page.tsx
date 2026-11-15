import Link from "next/link";
import { requireInstructor } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listAllNews } from "@/lib/data/news";
import { newsListSchema } from "@/lib/validation";
import { NEWS_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manage news
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, edit, AI-summarize, and publish corporate–startup collaboration news.
          </p>
        </div>
        <Link
          href="/news/manage/new"
          className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New item
        </Link>
      </div>

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
        <div className="space-y-4">
          {items.map((item) => {
            const categoryLabel =
              NEWS_CATEGORY_LABELS[item.category] ?? item.category;

            return (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="neutral">{categoryLabel}</Badge>
                      {item.status === "PUBLISHED" ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="warning">Draft</Badge>
                      )}
                      {item.aiAssisted && (
                        <Badge variant="info">AI-assisted</Badge>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                      {item.headline}
                    </h2>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
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

                  <div className="flex items-center self-start">
                    <Link
                      href={`/news/manage/${item.id}`}
                      className="inline-flex items-center justify-center min-h-[36px] px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 text-sm text-slate-500">
            <div>
              Page {currentPage} of {totalPages} ({total} total)
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={makeUrl(currentPage - 1)}
                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed">
                  Previous
                </span>
              )}
              {currentPage < totalPages ? (
                <Link
                  href={makeUrl(currentPage + 1)}
                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
