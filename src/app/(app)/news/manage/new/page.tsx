import Link from "next/link";
import { requireInstructor } from "@/lib/auth";
import { getAiStatus } from "@/lib/ai";
import { NewsForm } from "@/components/news-form";
import { Card } from "@/components/ui";

export const instant = false;

export default async function NewNewsPage() {
  await requireInstructor();
  const aiStatus = getAiStatus();

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <Link
          href="/news/manage"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
        >
          ← Back to manage news
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          New news item
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste article text, generate summary and interpretation, and publish to the cohort.
        </p>
      </div>

      <Card className="p-6">
        <NewsForm
          initial={{
            category: "",
            headline: "",
            companies: "",
            publishedOn: "",
            sourceName: "",
            sourceUrl: "",
            sourceText: "",
            factSummary: "",
            whyItMatters: "",
            status: "DRAFT",
            aiAssisted: false,
          }}
          aiConfigured={aiStatus.configured}
          aiIsDemo={aiStatus.provider === "demo"}
        />
      </Card>
    </div>
  );
}
