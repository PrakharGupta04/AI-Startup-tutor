"use client";

import React, { useActionState, useState } from "react";
import type { MemberRow } from "@/lib/data/users";
import { formatDate } from "@/lib/format";
import { Field, Input, Button, Badge, Select } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { ErrorMessage } from "@/components/error-message";
import {
  addMemberAction,
  resetPasswordAction,
  setActiveAction,
  setRoleAction,
} from "@/app/(app)/settings/actions";

export function AddMemberForm() {
  const [state, formAction, isPending] = useActionState(addMemberAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state && state.ok && (
        <div
          role="status"
          className="rounded-md border border-line bg-success-soft p-3 text-sm text-success"
        >
          {state.data.message}
        </div>
      )}

      {state && !state.ok && state.error && (
        <ErrorMessage message={state.error} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Full Name"
          htmlFor="add-member-name"
          error={state && !state.ok ? state.fieldErrors?.name : undefined}
        >
          <Input
            id="add-member-name"
            name="name"
            type="text"
            required
            disabled={isPending}
            placeholder="Jane Doe"
          />
        </Field>

        <Field
          label="Email Address"
          htmlFor="add-member-email"
          error={state && !state.ok ? state.fieldErrors?.email : undefined}
        >
          <Input
            id="add-member-email"
            name="email"
            type="email"
            required
            disabled={isPending}
            placeholder="jane@example.com"
          />
        </Field>

        <Field
          label="Initial Password"
          htmlFor="add-member-password"
          hint="8–72 characters"
          error={state && !state.ok ? state.fieldErrors?.password : undefined}
        >
          <Input
            id="add-member-password"
            name="password"
            type="password"
            required
            disabled={isPending}
          />
        </Field>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add Member"}
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordModal({
  member,
  onClose,
}: {
  member: MemberRow;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    null
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl space-y-4 border border-line">
        <h3 className="text-lg font-bold text-ink">
          Reset Password for {member.name}
        </h3>
        <p className="text-sm text-ink-muted">
          Set a new temporary password for this user ({member.email}).
        </p>

        {state && state.ok && (
          <div
            role="status"
            className="rounded-md border border-line bg-success-soft p-3 text-sm text-success"
          >
            {state.data.message}
          </div>
        )}

        {state && !state.ok && state.error && (
          <ErrorMessage message={state.error} />
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={member.id} />

          <Field
            label="New Password"
            htmlFor={`reset-password-${member.id}`}
            hint="8–72 characters"
            error={
              state && !state.ok ? state.fieldErrors?.newPassword : undefined
            }
          >
            <Input
              id={`reset-password-${member.id}`}
              name="newPassword"
              type="password"
              required
              disabled={isPending}
              autoFocus
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Set New Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MembersTable({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId: number;
}) {
  const [resetTarget, setResetTarget] = useState<MemberRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {actionError && <ErrorMessage message={actionError} />}

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            <tr>
              <th scope="col" className="px-4 py-3 sm:px-6">
                Name & Email
              </th>
              <th scope="col" className="px-4 py-3">
                Role
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Joined
              </th>
              <th scope="col" className="px-4 py-3 text-right sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {members.map((member) => {
              const isSelf = member.id === currentUserId;

              return (
                <tr key={member.id} className="min-h-[48px] hover:bg-canvas transition-colors">
                  <td className="px-4 py-3 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} size="sm" />
                      <div>
                        <div className="font-medium text-ink">
                          {member.name}
                        </div>
                        <div className="text-xs text-ink-muted">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isSelf ? (
                      <Badge variant={member.role === "INSTRUCTOR" ? "info" : "neutral"}>
                        {member.role === "INSTRUCTOR" ? "Instructor" : "Member"}
                      </Badge>
                    ) : (
                      <form
                        action={async (formData) => {
                          setActionError(null);
                          const result = await setRoleAction(null, formData);
                          if (!result.ok) {
                            setActionError(result.error);
                          }
                        }}
                      >
                        <input type="hidden" name="userId" value={member.id} />
                        <Select
                          name="role"
                          defaultValue={member.role}
                          onChange={(e) => e.target.form?.requestSubmit()}
                          className="text-xs py-1 px-2 min-h-[32px] w-auto"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="INSTRUCTOR">Instructor</option>
                        </Select>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={member.isActive ? "success" : "danger"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">
                    {formatDate(member.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-xs sm:px-6">
                    {isSelf ? (
                      <span className="text-ink-subtle font-medium italic">You</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {/* Toggle Active status */}
                        <form
                          action={async (formData) => {
                            setActionError(null);
                            const result = await setActiveAction(null, formData);
                            if (!result.ok) {
                              setActionError(result.error);
                            }
                          }}
                        >
                          <input type="hidden" name="userId" value={member.id} />
                          <input
                            type="hidden"
                            name="isActive"
                            value={member.isActive ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className={`font-medium hover:underline cursor-pointer ${
                              member.isActive
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>

                        <span className="text-line">|</span>

                        {/* Reset password button */}
                        <button
                          type="button"
                          onClick={() => setResetTarget(member)}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          Reset password
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <ResetPasswordModal
          member={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}
