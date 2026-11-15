import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listInteractions } from "@/lib/data/tutor";
import { getAiStatus } from "@/lib/ai";
import { interactionListSchema } from "@/lib/validation";
import { AskForm } from "@/components/ask-form";
import { InteractionCard } from "@/components/interaction-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";

export const instant = false;

interface TutorPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TutorPage(props: TutorPageProps) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const rawPage =
    typeof searchParams.page === "string" ? searchParams.page : undefined;

  const parsed = interactionListSchema.parse({
    page: rawPage,
  });

  const { items, total, pageSize } = await listInteractions(
    getDb(),
    user,
    parsed
  );
  const aiStatus = getAiStatus();

  const currentPage = parsed.page;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="AI Tutor"
        description="Everyone in the group can see these questions, answers and notes."
      />

      {/* Prominent Ask Form Card */}
      <Card className="p-6">
        <AskForm
          aiConfigured={aiStatus.configured}
          aiIsDemo={aiStatus.provider === "demo"}
        />
      </Card>

      {/* Shared Log */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">
          Questions & Answers ({total})
        </h2>

        {items.length === 0 ? (
          <EmptyState
            title="No questions yet"
            description="Ask the first one to start the group learning log."
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <InteractionCard
                key={item.id}
                interaction={item}
                currentUserId={user.id}
              />
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
                      href={`/tutor?page=${currentPage - 1}`}
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
                      href={`/tutor?page=${currentPage + 1}`}
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
    </div>
  );
}
