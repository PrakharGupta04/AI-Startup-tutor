import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listInteractions } from "@/lib/data/tutor";
import { getAiStatus } from "@/lib/ai";
import { interactionListSchema } from "@/lib/validation";
import { AskForm } from "@/components/ask-form";
import { InteractionCard } from "@/components/interaction-card";
import { EmptyState } from "@/components/empty-state";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          AI Tutor
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Everyone in the group can see these questions, answers and notes.
        </p>
      </div>

      {/* Ask Form Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <AskForm
          aiConfigured={aiStatus.configured}
          aiIsDemo={aiStatus.provider === "demo"}
        />
      </div>

      {/* Shared Log */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Showing page {currentPage} of {totalPages} ({total} total)
                </p>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={`/tutor?page=${currentPage - 1}`}
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
                      href={`/tutor?page=${currentPage + 1}`}
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
    </div>
  );
}
