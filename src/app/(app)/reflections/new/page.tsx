import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAiStatus } from "@/lib/ai";
import { ReflectionForm } from "@/components/reflection-form";
import { PageHeader } from "@/components/page-header";

export const instant = false;

export default async function NewReflectionPage() {
  await requireUser();
  const aiStatus = getAiStatus();

  const today = new Date().toISOString().slice(0, 10);

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
          title="New reflection"
          description="Record your raw session notes, optionally structure them with AI, and review before submitting."
        />
      </div>

      <div className="rounded-lg border border-line bg-surface p-6">
        <ReflectionForm
          initial={{
            sessionTitle: "",
            sessionDate: today,
            rawNotes: "",
            concepts: "",
            takeaways: "",
            observations: "",
            insights: "",
            openQuestions: "",
            aiStructured: false,
            status: "DRAFT",
          }}
          aiConfigured={aiStatus.configured}
          aiIsDemo={aiStatus.provider === "demo"}
        />
      </div>
    </div>
  );
}
