import Link from "next/link";
import {
  NotebookPen,
  MessagesSquare,
  Newspaper,
  FilePlus2,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { getAiStatus } from "@/lib/ai";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { NEWS_CATEGORY_LABELS, type NewsCategory } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, Badge, ButtonLink } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
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
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Welcome Page Header */}
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={env.GROUP_NAME}
        actions={
          <Badge variant={isInstructor ? "info" : "neutral"}>
            {isInstructor ? "Instructor" : "Member"}
          </Badge>
        }
      />

      {/* Row of three large action cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/reflections/new"
            className="group block bg-surface border border-line rounded-lg p-5 hover:border-brand/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                <NotebookPen className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                  Write a reflection
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 truncate">
                  Capture notes and structure session learnings
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/tutor"
            className="group block bg-surface border border-line rounded-lg p-5 hover:border-brand/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ai-soft text-ai shrink-0 group-hover:bg-ai group-hover:text-white transition-colors">
                <MessagesSquare className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                  Ask the tutor
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 truncate">
                  Get AI guidance on corporate venturing
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/news"
            className="group block bg-surface border border-line rounded-lg p-5 hover:border-brand/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                <Newspaper className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                  Read the news
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 truncate">
                  Follow curated corporate–startup partnerships
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Instructor sub-actions */}
        {isInstructor && (
          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <ButtonLink
              href="/news/manage/new"
              variant="secondary"
              size="sm"
              className="gap-1.5"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
              <span>Add a news item</span>
            </ButtonLink>
            <ButtonLink
              href="/settings/members"
              variant="secondary"
              size="sm"
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
              <span>Manage members</span>
            </ButtonLink>
          </div>
        )}
      </div>

      {/* Notices (draft counts) as warning-soft banners */}
      {(summary.myDraftCount > 0 ||
        (isInstructor &&
          summary.newsDraftCount !== null &&
          summary.newsDraftCount > 0)) && (
        <div className="space-y-2">
          {summary.myDraftCount > 0 && (
            <Link
              href="/reflections?scope=mine"
              className="flex items-center justify-between p-3 rounded-md bg-warning-soft border border-warning/20 text-warning text-sm hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>
                  You have {summary.myDraftCount} draft reflection
                  {summary.myDraftCount === 1 ? "" : "s"} waiting for submission
                </span>
              </div>
              <span className="text-xs font-semibold">Review →</span>
            </Link>
          )}

          {isInstructor &&
            summary.newsDraftCount !== null &&
            summary.newsDraftCount > 0 && (
              <Link
                href="/news/manage"
                className="flex items-center justify-between p-3 rounded-md bg-warning-soft border border-warning/20 text-warning text-sm hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>
                    {summary.newsDraftCount} news item
                    {summary.newsDraftCount === 1 ? "" : "s"} waiting to be published
                  </span>
                </div>
                <span className="text-xs font-semibold">Manage →</span>
              </Link>
            )}
        </div>
      )}

      {/* Instructor AI status card */}
      {isInstructor && (
        <Card className="p-3 bg-surface border-line">
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-ai" strokeWidth={1.75} />
              <span className="font-semibold text-ink">AI Status:</span>
              <span className="text-ink-muted">
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

      {/* Responsive 3-column grid for activity sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity 1: Recent reflections */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
              <h2 className="text-base font-semibold text-ink">
                Recent reflections
              </h2>
              <Link
                href="/reflections"
                className="text-xs font-medium text-accent hover:underline"
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
              <div className="divide-y divide-line">
                {summary.recentReflections.map((ref) => (
                  <Link
                    key={ref.id}
                    href={`/reflections/${ref.id}`}
                    className="block py-3 first:pt-0 last:pb-0 hover:text-brand transition-colors group"
                  >
                    <div className="text-sm font-semibold text-ink group-hover:text-brand transition-colors line-clamp-2">
                      {ref.sessionTitle}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted flex-wrap">
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

        {/* Activity 2: Latest news */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
              <h2 className="text-base font-semibold text-ink">
                Latest news
              </h2>
              <Link
                href="/news"
                className="text-xs font-medium text-accent hover:underline"
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
              <div className="divide-y divide-line">
                {summary.latestNews.map((news) => {
                  const categoryLabel =
                    NEWS_CATEGORY_LABELS[news.category as NewsCategory] ??
                    news.category;

                  return (
                    <Link
                      key={news.id}
                      href="/news"
                      className="block py-3 first:pt-0 last:pb-0 hover:text-brand transition-colors group"
                    >
                      <div className="text-xs font-medium text-brand mb-0.5">
                        {categoryLabel}
                      </div>
                      <div className="text-sm font-semibold text-ink group-hover:text-brand transition-colors line-clamp-2">
                        {news.headline}
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">
                        {news.sourceName}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Activity 3: Recent questions */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
              <h2 className="text-base font-semibold text-ink">
                Recent questions
              </h2>
              <Link
                href="/tutor"
                className="text-xs font-medium text-accent hover:underline"
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
              <div className="divide-y divide-line">
                {summary.recentInteractions.map((item) => {
                  const truncatedPrompt =
                    item.prompt.length > 100
                      ? `${item.prompt.slice(0, 100)}…`
                      : item.prompt;

                  return (
                    <Link
                      key={item.id}
                      href={`/tutor/${item.id}`}
                      className="block py-3 first:pt-0 last:pb-0 hover:text-brand transition-colors group"
                    >
                      <div className="text-sm font-semibold text-ink group-hover:text-brand transition-colors line-clamp-2">
                        {truncatedPrompt}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted flex-wrap">
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
