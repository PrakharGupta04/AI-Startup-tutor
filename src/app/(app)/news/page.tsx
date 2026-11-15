import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listPublishedNews } from "@/lib/data/news";
import { newsListSchema } from "@/lib/validation";
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from "@/lib/constants";
import { NewsCard } from "@/components/news-card";
import { EmptyState } from "@/components/empty-state";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Collaboration news
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curated corporate–startup collaboration news, reported facts, and interpretation.
          </p>
        </div>
        {user.role === "INSTRUCTOR" && (
          <Link
            href="/news/manage"
            className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Manage news
          </Link>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-slate-200 pb-3">
        <Link
          href={makeUrl(1, "")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !parsed.category
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
