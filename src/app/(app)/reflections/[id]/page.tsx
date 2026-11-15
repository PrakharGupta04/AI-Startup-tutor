import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getReflection } from "@/lib/data/reflections";
import { isInstructor } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { Card, Badge } from "@/components/ui";
import { DeleteReflectionButton } from "@/components/delete-reflection-button";
import { formatDate } from "@/lib/format";

export const instant = false;

interface ReflectionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReflectionDetailPage(
  props: ReflectionDetailPageProps
) {
  const user = await requireUser();
  const { id: rawId } = await props.params;

  const id = parseInt(rawId, 10);
  if (isNaN(id) || !/^\d+$/.test(rawId) || id <= 0) {
    notFound();
  }

  let reflection;
  try {
    reflection = await getReflection(getDb(), user, id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const isAuthor = reflection.authorId === user.id;
  const canDelete =
    (isAuthor && reflection.status === "DRAFT") ||
    (isInstructor(user) && reflection.status === "SUBMITTED");

  const structuredSections = [
    { label: "Concepts", value: reflection.concepts },
    { label: "Key takeaways", value: reflection.takeaways },
    { label: "Observations", value: reflection.observations },
    { label: "Insights", value: reflection.insights },
    { label: "Open questions", value: reflection.openQuestions },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <Link
          href="/reflections"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
        >
          ← Back to reflections
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 break-words">
              {reflection.sessionTitle}
            </h1>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span>
                Session date:{" "}
                <span className="font-medium text-slate-700">
                  {reflection.sessionDate}
                </span>
              </span>
              <span>•</span>
              <span>
                Author:{" "}
                <span className="font-medium text-slate-700">
                  {reflection.authorName}
                </span>
              </span>
              <span>•</span>
              <span>
                Created:{" "}
                <span className="font-medium text-slate-700">
                  {formatDate(reflection.createdAt)}
                </span>
              </span>
              {reflection.submittedAt && (
                <>
                  <span>•</span>
                  <span>
                    Submitted:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDate(reflection.submittedAt)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {reflection.status === "DRAFT" ? (
              <Badge variant="warning">Draft</Badge>
            ) : (
              <Badge variant="success">Submitted</Badge>
            )}
            {reflection.aiStructured && (
              <Badge variant="info">AI-structured</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {(isAuthor || canDelete) && (
        <div className="flex items-center gap-3 pt-2">
          {isAuthor && (
            <Link
              href={`/reflections/${reflection.id}/edit`}
              className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit reflection
            </Link>
          )}
          {canDelete && <DeleteReflectionButton id={reflection.id} />}
        </div>
      )}

      {/* Structured Fields */}
      <div className="space-y-4">
        {structuredSections.map((section) => (
          <Card key={section.label} title={section.label}>
            {section.value && section.value.trim() !== "" ? (
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {section.value}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">None</p>
            )}
          </Card>
        ))}
      </div>

      {/* Collapsed Original Notes */}
      <details className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900 select-none">
          Original notes
        </summary>
        <div className="mt-3 pt-3 border-t border-slate-100">
          {reflection.rawNotes && reflection.rawNotes.trim() !== "" ? (
            <div className="text-sm text-slate-800 whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded-md border border-slate-200 overflow-x-auto leading-relaxed">
              {reflection.rawNotes}
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">
              No original notes recorded.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
