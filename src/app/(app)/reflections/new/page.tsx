import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAiStatus } from "@/lib/ai";
import { ReflectionForm } from "@/components/reflection-form";

export const instant = false;

export default async function NewReflectionPage() {
  await requireUser();
  const aiStatus = getAiStatus();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <Link
          href="/reflections"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
        >
          ← Back to reflections
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          New reflection
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Record your raw session notes, optionally structure them with AI, and review before submitting.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
