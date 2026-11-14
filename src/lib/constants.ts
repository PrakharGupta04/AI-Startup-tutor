export const ROLES = ["MEMBER", "INSTRUCTOR"] as const;
export type Role = (typeof ROLES)[number];

export const REFLECTION_STATUSES = ["DRAFT", "SUBMITTED"] as const;
export type ReflectionStatus = (typeof REFLECTION_STATUSES)[number];

export const INTERACTION_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export type InteractionStatus = (typeof INTERACTION_STATUSES)[number];

export const NEWS_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

export const NEWS_CATEGORIES = [
  "PARTNERSHIPS_ALLIANCES",
  "ACQUISITIONS",
  "CORPORATE_VENTURE",
  "ACCELERATORS_INCUBATORS",
  "PILOTS_JV_OPEN_INNOVATION",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  PARTNERSHIPS_ALLIANCES: "Partnerships & Alliances",
  ACQUISITIONS: "Acquisitions",
  CORPORATE_VENTURE: "Corporate Venture Investment",
  ACCELERATORS_INCUBATORS: "Accelerators & Incubators",
  PILOTS_JV_OPEN_INNOVATION: "Pilots, Joint Ventures & Open Innovation",
};
