import Link from "next/link";
import { requireInstructor } from "@/lib/auth";
import { getAiStatus } from "@/lib/ai";
import { NewsForm } from "@/components/news-form";
import { PageHeader } from "@/components/page-header";

export const instant = false;

export default async function NewNewsPage() {
  await requireInstructor();
  const aiStatus = getAiStatus();

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div>
        <Link
          href="/news/manage"
          className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1 mb-2"
        >
          ← Back to manage news
        </Link>
        <PageHeader
          title="New news item"
          description="Paste article text, generate summary and interpretation, and publish to the cohort."
        />
      </div>

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
    </div>
  );
}
