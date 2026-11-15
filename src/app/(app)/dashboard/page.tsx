import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { getAiStatus } from "@/lib/ai";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { NEWS_CATEGORY_LABELS, type NewsCategory } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";

export const instant = false;

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDb();
  const env = getEnv();

  const isInstructor = user.role === "INSTRUCTOR";
  const summary = await getDashboardSummary(db, user);
  const aiStatus = getAiStatus();

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {user.name}
            </h1>
            <Badge variant={isInstructor ? "info" : "neutral"}>
              {isInstructor ? "Instructor" : "Member"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{env.GROUP_NAME}</p>
        </div>
      </div>

      {/* Quick actions row */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <Link
          href="/reflections/new"
          className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          New reflection
        </Link>
        <Link
          href="/tutor"
          className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Ask the tutor
        </Link>
        <Link
          href="/news"
          className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Browse news
        </Link>
        {isInstructor && (
          <>
            <Link
              href="/news/manage/new"
              className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Add news item
            </Link>
            <Link
              href="/settings/members"
              className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Manage members
            </Link>
          </>
        )}
      </div>

      {/* Notices */}
      <div className="space-y-2">
        {summary.myDraftCount > 0 && (
          <Link
            href="/reflections?scope=mine"
            className="block p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm hover:bg-amber-100/80 transition-colors"
          >
            You have {summary.myDraftCount} draft reflection
            {summary.myDraftCount === 1 ? "" : "s"} waiting for submission →
          </Link>
        )}
        {isInstructor &&
          summary.newsDraftCount !== null &&
          summary.newsDraftCount > 0 && (
            <Link
              href="/news/manage"
              className="block p-3 rounded-md bg-sky-50 border border-sky-200 text-sky-900 text-sm hover:bg-sky-100/80 transition-colors"
            >
              {summary.newsDraftCount} news item
              {summary.newsDraftCount === 1 ? "" : "s"} waiting to be published →
            </Link>
          )}
      </div>

      {/* Instructor AI status card */}
      {isInstructor && (
        <Card className="p-4 bg-slate-50/80 border-slate-200">
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">AI Status:</span>
              <span className="text-slate-600">
                {aiStatus.provider} ({aiStatus.model})
              </span>
            </div>
            <div>
              {aiStatus.provider === "demo" ? (
                <Badge variant="warning">
                  Demo mode: placeholder output
                </Badge>
              ) : aiStatus.configured ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="warning">
                  No API key: AI features disabled
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Responsive 3-column grid for the three pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar 1: Recent reflections */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Recent reflections
              </h2>
              <Link
                href="/reflections"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View all →
              </Link>
            </div>

            {summary.recentReflections.length === 0 ? (
              <EmptyState
                title="No reflections yet"
                description="Share your learnings from cohort sessions."
                action={{
                  label: "Create reflection",
                  href: "/reflections/new",
                }}
              />
            ) : (
              <div className="space-y-3">
                {summary.recentReflections.map((ref) => (
                  <Link
                    key={ref.id}
                    href={`/reflections/${ref.id}`}
                    className="block p-3 rounded-md hover:bg-slate-50 transition-colors border border-slate-100"
                  >
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {ref.sessionTitle}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span>{ref.authorName}</span>
                      {ref.submittedAt && (
                        <>
                          <span>·</span>
                          <span>{formatDate(ref.submittedAt)}</span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Pillar 2: Latest news */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Latest news
              </h2>
              <Link
                href="/news"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View all →
              </Link>
            </div>

            {summary.latestNews.length === 0 ? (
              <EmptyState
                title="No news published yet"
                description="Curated corporate–startup news will appear here."
              />
            ) : (
              <div className="space-y-3">
                {summary.latestNews.map((news) => {
                  const categoryLabel =
                    NEWS_CATEGORY_LABELS[news.category as NewsCategory] ??
                    news.category;

                  return (
                    <Link
                      key={news.id}
                      href="/news"
                      className="block p-3 rounded-md hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <div className="text-xs font-medium text-blue-600 mb-1">
                        {categoryLabel}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {news.headline}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {news.sourceName}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Pillar 3: Recent questions */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Recent questions
              </h2>
              <Link
                href="/tutor"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View all →
              </Link>
            </div>

            {summary.recentInteractions.length === 0 ? (
              <EmptyState
                title="No questions yet"
                description="Ask a question to receive AI tutor guidance."
                action={{
                  label: "Ask the tutor",
                  href: "/tutor",
                }}
              />
            ) : (
              <div className="space-y-3">
                {summary.recentInteractions.map((item) => {
                  const truncatedPrompt =
                    item.prompt.length > 100
                      ? `${item.prompt.slice(0, 100)}…`
                      : item.prompt;

                  return (
                    <Link
                      key={item.id}
                      href={`/tutor/${item.id}`}
                      className="block p-3 rounded-md hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <div className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {truncatedPrompt}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span>{item.authorName}</span>
                        <span>·</span>
                        <span>{formatDateTime(new Date(item.createdAt))}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
