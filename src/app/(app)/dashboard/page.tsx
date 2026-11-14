import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { Card, Badge } from "@/components/ui";
import { isInstructor } from "@/lib/permissions";

export const instant = false;

export default async function DashboardPage() {
  const user = await requireUser();
  const env = getEnv();

  const roleLabel = isInstructor(user) ? "Instructor" : "Member";
  const roleVariant = isInstructor(user) ? "info" : "neutral";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome, {user.name}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {env.GROUP_NAME}
        </p>
      </div>

      <Card>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Group
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {env.GROUP_NAME}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Role
            </dt>
            <dd className="mt-1">
              <Badge variant={roleVariant}>{roleLabel}</Badge>
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
