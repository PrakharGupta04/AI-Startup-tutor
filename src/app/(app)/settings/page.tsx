import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import {
  ProfileForm,
  ChangePasswordForm,
} from "@/components/settings-forms";

export const instant = false;

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details and password
        </p>
      </div>

      <Card title="Profile Details">
        <ProfileForm initialName={user.name} email={user.email} />
      </Card>

      <Card title="Change Password">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
