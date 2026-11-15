import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listPublishedNews } from "@/lib/data/news";
import { newsListSchema } from "@/lib/validation";
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from "@/lib/constants";
import { NewsCard } from "@/components/news-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui";

export const instant = false;

interface NewsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewsPage(props: NewsPageProps) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const rawCategory =
    typeof searchParams.category === "string" ? searchParams.category : undefined;
  const rawPage =
    typeof searchParams.page === "string" ? searchParams.page : undefined;

  const parsed = newsListSchema.parse({
    category: rawCategory,
    page: rawPage,
  });

  const { items, total, pageSize } = await listPublishedNews(
    getDb(),
    user,
    parsed
  );

  const currentPage = parsed.page;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function makeUrl(targetPage: number, cat?: string) {
    const params = new URLSearchParams();
    const c = cat !== undefined ? cat : parsed.category;
    if (c) {
      params.set("category", c);
    }
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    }
    const query = params.toString();
    return query ? `/news?${query}` : "/news";
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Header with optional Manage News button */}
      <PageHeader
        title="Collaboration news"
        description="Curated corporate–startup collaboration news, reported facts, and interpretation."
        actions={
          user.role === "INSTRUCTOR" ? (
            <ButtonLink href="/news/manage" variant="secondary" size="sm">
              Manage news
            </ButtonLink>
          ) : undefined
        }
      />

      {/* Category filter as horizontally scrollable chip row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Link
          href={makeUrl(1, "")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            !parsed.category
              ? "bg-brand text-white"
              : "bg-surface border border-line text-ink-muted hover:text-ink hover:bg-canvas"
          }`}
        >
          All
        </Link>
        {NEWS_CATEGORIES.map((catKey) => {
          const isSelected = parsed.category === catKey;
          return (
            <Link
              key={catKey}
              href={makeUrl(1, catKey)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? "bg-brand text-white"
                  : "bg-surface border border-line text-ink-muted hover:text-ink hover:bg-canvas"
              }`}
            >
              {NEWS_CATEGORY_LABELS[catKey]}
            </Link>
          );
        })}
      </div>

      {/* Content: items or empty state */}
      {items.length === 0 ? (
        <EmptyState
          title="No news published yet."
          description={
            parsed.category
              ? "No published news items match this category filter."
              : "Check back soon for curated corporate–startup collaboration news."
          }
        />
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}

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
