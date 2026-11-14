"use client";

import React, { useActionState } from "react";
import { Field, Input, Button } from "@/components/ui";
import { ErrorMessage } from "@/components/error-message";
import {
  updateProfileAction,
  changePasswordAction,
} from "@/app/(app)/settings/actions";

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state && state.ok && (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {state.data.message}
        </div>
      )}

      {state && !state.ok && state.error && (
        <ErrorMessage message={state.error} />
      )}

      <Field
        label="Full Name"
        htmlFor="profile-name"
        error={state && !state.ok ? state.fieldErrors?.name : undefined}
      >
        <Input
          id="profile-name"
          name="name"
          type="text"
          defaultValue={initialName}
          required
          autoComplete="name"
          disabled={isPending}
        />
      </Field>

      <Field
        label="Email Address"
        htmlFor="profile-email"
        hint="Email address cannot be changed."
      >
        <Input
          id="profile-email"
          name="email"
          type="email"
          defaultValue={email}
          disabled
          className="bg-slate-50 text-slate-500 cursor-not-allowed"
        />
      </Field>

      <div className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state && state.ok && (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {state.data.message}
        </div>
      )}

      {state && !state.ok && state.error && (
        <ErrorMessage message={state.error} />
      )}

      <Field
        label="Current Password"
        htmlFor="currentPassword"
        error={
          state && !state.ok ? state.fieldErrors?.currentPassword : undefined
        }
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          disabled={isPending}
        />
      </Field>

      <Field
        label="New Password"
        htmlFor="newPassword"
        hint="Must be 8–72 characters."
        error={state && !state.ok ? state.fieldErrors?.newPassword : undefined}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          disabled={isPending}
        />
      </Field>

      <Field
        label="Confirm New Password"
        htmlFor="confirmPassword"
        error={
          state && !state.ok ? state.fieldErrors?.confirmPassword : undefined
        }
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          disabled={isPending}
        />
      </Field>

      <div className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
