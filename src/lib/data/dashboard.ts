import { eq, desc, and, count } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { reflections, newsItems, users } from "@/lib/db/schema";
import { isInstructor, type AuthUser } from "@/lib/permissions";
import { listPublishedNews, type NewsPublicView } from "@/lib/data/news";
import { listInteractions, type InteractionView } from "@/lib/data/tutor";

export type DashboardReflection = {
  id: number;
  sessionTitle: string;
  sessionDate: string;
  authorName: string;
  submittedAt: Date | null;
  aiStructured: boolean;
};

export async function getDashboardSummary(
  db: Db,
  actor: AuthUser
): Promise<{
  recentReflections: DashboardReflection[];
  latestNews: NewsPublicView[];
  recentInteractions: InteractionView[];
  myDraftCount: number;
  newsDraftCount: number | null;
}> {
  // 1. Recent reflections: SUBMITTED reflections only, newest first by submittedAt, limit 5
  const recentReflections = await db
    .select({
      id: reflections.id,
      sessionTitle: reflections.sessionTitle,
      sessionDate: reflections.sessionDate,
      authorName: users.name,
      submittedAt: reflections.submittedAt,
      aiStructured: reflections.aiStructured,
    })
    .from(reflections)
    .innerJoin(users, eq(reflections.authorId, users.id))
    .where(eq(reflections.status, "SUBMITTED"))
    .orderBy(desc(reflections.submittedAt), desc(reflections.id))
    .limit(5);

  // 2. Latest news: first 5 items from listPublishedNews
  const newsResult = await listPublishedNews(db, actor, { page: 1 });
  const latestNews = newsResult.items.slice(0, 5);

  // 3. Recent interactions: first 5 items from listInteractions
  const interactionsResult = await listInteractions(db, actor, { page: 1 });
  const recentInteractions = interactionsResult.items.slice(0, 5);

  // 4. myDraftCount: number of actor's own reflections with status DRAFT
  const [draftResult] = await db
    .select({ total: count() })
    .from(reflections)
    .where(
      and(
        eq(reflections.authorId, actor.id),
        eq(reflections.status, "DRAFT")
      )
    );
  const myDraftCount = draftResult ? draftResult.total : 0;

  // 5. newsDraftCount: for instructor, count of news_items with status DRAFT; for member, null
  let newsDraftCount: number | null = null;
  if (isInstructor(actor)) {
    const [newsDraftResult] = await db
      .select({ total: count() })
      .from(newsItems)
      .where(eq(newsItems.status, "DRAFT"));
    newsDraftCount = newsDraftResult ? newsDraftResult.total : 0;
  }

  return {
    recentReflections,
    latestNews,
    recentInteractions,
    myDraftCount,
    newsDraftCount,
  };
}
