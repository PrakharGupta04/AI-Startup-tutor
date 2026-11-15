import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInstructor } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getNewsForEdit } from "@/lib/data/news";
import { getAiStatus } from "@/lib/ai";
import { AppError } from "@/lib/errors";
import { NewsForm } from "@/components/news-form";
import { PageHeader } from "@/components/page-header";

export const instant = false;

interface EditNewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPage(props: EditNewsPageProps) {
  const instructor = await requireInstructor();
  const { id: rawId } = await props.params;

  const id = parseInt(rawId, 10);
  if (isNaN(id) || !/^\d+$/.test(rawId) || id <= 0) {
    notFound();
  }

  let item;
  try {
    item = await getNewsForEdit(getDb(), instructor, id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

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
          title="Edit news item"
          description="Update article content, re-generate summaries, or manage publication status."
        />
      </div>

      <NewsForm
        initial={{
          id: item.id,
          category: item.category,
          headline: item.headline,
          companies: item.companies || "",
          publishedOn: item.publishedOn || "",
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl,
          sourceText: item.sourceText,
          factSummary: item.factSummary,
          whyItMatters: item.whyItMatters,
          status: item.status,
          aiAssisted: item.aiAssisted,
        }}
        aiConfigured={aiStatus.configured}
        aiIsDemo={aiStatus.provider === "demo"}
      />
    </div>
  );
}
