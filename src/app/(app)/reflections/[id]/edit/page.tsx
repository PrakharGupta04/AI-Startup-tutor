import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getReflection } from "@/lib/data/reflections";
import { getAiStatus } from "@/lib/ai";
import { AppError } from "@/lib/errors";
import { ReflectionForm } from "@/components/reflection-form";

export const instant = false;

interface EditReflectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReflectionPage(
  props: EditReflectionPageProps
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

  if (reflection.authorId !== user.id) {
    notFound();
  }

  const aiStatus = getAiStatus();

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <Link
          href={`/reflections/${reflection.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
        >
          ← Back to reflection
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit reflection
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update notes or structured insights.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ReflectionForm
          initial={{
            id: reflection.id,
            sessionTitle: reflection.sessionTitle,
            sessionDate: reflection.sessionDate,
            rawNotes: reflection.rawNotes,
            concepts: reflection.concepts,
            takeaways: reflection.takeaways,
            observations: reflection.observations,
            insights: reflection.insights,
            openQuestions: reflection.openQuestions,
            aiStructured: reflection.aiStructured,
            status: reflection.status,
          }}
          aiConfigured={aiStatus.configured}
          aiIsDemo={aiStatus.provider === "demo"}
        />
      </div>
    </div>
  );
}
