import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getReflection } from "@/lib/data/reflections";
import { isInstructor } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { Card, Badge, ButtonLink } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
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
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div>
        <Link
          href="/reflections"
          className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1 mb-2"
        >
          ← Back to reflections
        </Link>
        <PageHeader
          title={reflection.sessionTitle}
          actions={
            (isAuthor || canDelete) && (
              <div className="flex items-center gap-2 flex-wrap">
                {isAuthor && (
                  <ButtonLink
                    href={`/reflections/${reflection.id}/edit`}
                    variant="primary"
                    size="sm"
                  >
                    Edit reflection
                  </ButtonLink>
                )}
                {canDelete && <DeleteReflectionButton id={reflection.id} />}
              </div>
            )
          }
        />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted pb-4 border-b border-line">
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar name={reflection.authorName} size="sm" />
          <span className="font-medium text-ink">{reflection.authorName}</span>
          <span>•</span>
          <span>Session date: {reflection.sessionDate}</span>
          {reflection.submittedAt ? (
            <>
              <span>•</span>
              <span>Submitted: {formatDate(reflection.submittedAt)}</span>
            </>
          ) : (
            <>
              <span>•</span>
              <span>Created: {formatDate(reflection.createdAt)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {reflection.status === "DRAFT" ? (
            <Badge variant="neutral">Draft</Badge>
          ) : (
            <Badge variant="success">Submitted</Badge>
          )}
          {reflection.aiStructured && (
            <Badge variant="ai">AI-structured</Badge>
          )}
        </div>
      </div>

      {/* Structured Fields */}
      <div className="space-y-4">
        {structuredSections.map((section) => (
          <Card key={section.label} className="space-y-2">
            <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              {section.label}
            </h2>
            {section.value && section.value.trim() !== "" ? (
              <div className="text-[15px] text-ink whitespace-pre-wrap leading-relaxed">
                {section.value}
              </div>
            ) : (
              <p className="text-sm italic text-ink-subtle">None</p>
            )}
          </Card>
        ))}
      </div>

      {/* Collapsed Original Notes */}
      <details className="bg-surface border border-line rounded-lg p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink select-none hover:text-brand transition-colors">
          Original notes
        </summary>
        <div className="mt-3 pt-3 border-t border-line">
          {reflection.rawNotes && reflection.rawNotes.trim() !== "" ? (
            <div className="text-sm text-ink whitespace-pre-wrap font-mono bg-canvas p-4 rounded-md border border-line overflow-x-auto leading-relaxed">
              {reflection.rawNotes}
            </div>
          ) : (
            <p className="text-sm italic text-ink-subtle">
              No original notes recorded.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
