import { requireUser } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import {
  ProfileForm,
  ChangePasswordForm,
} from "@/components/settings-forms";

export const instant = false;

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="Account Settings"
        description="Manage your personal details and password"
      />

      <Card title="Profile Details">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-line">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle block">
                Email Address
              </span>
              <span className="text-sm font-medium text-ink mt-1 block">
                {user.email}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle block">
                Role
              </span>
              <div className="mt-1">
                <Badge variant={user.role === "INSTRUCTOR" ? "info" : "neutral"}>
                  {user.role === "INSTRUCTOR" ? "Instructor" : "Member"}
                </Badge>
              </div>
            </div>
          </div>

          <ProfileForm initialName={user.name} />
        </div>
      </Card>

      <Card title="Change Password">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
