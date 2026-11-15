import { requireInstructor } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { listMembers } from "@/lib/data/users";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { AddMemberForm, MembersTable } from "@/components/members-forms";

export const instant = false;

export default async function MembersPage() {
  const actor = await requireInstructor();
  const env = getEnv();
  const members = await listMembers(getDb(), actor);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cohort Members"
        description="Manage cohort participants, roles, account statuses, and credentials"
      />

      <Card title="Cohort Registration Code">
        <div className="space-y-2">
          <p className="text-sm text-ink-muted">
            Share this registration code with new participants so they can create an account and join this cohort.
          </p>
          <div className="inline-flex items-center gap-2 rounded-md bg-canvas px-3 py-2 font-mono text-base font-semibold text-ink select-all border border-line">
            {env.GROUP_JOIN_CODE}
          </div>
        </div>
      </Card>

      <Card title="Add New Member">
        <AddMemberForm />
      </Card>

      <Card title={`All Members (${members.length})`}>
        <MembersTable members={members} currentUserId={actor.id} />
      </Card>
    </div>
  );
}
