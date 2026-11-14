"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/register/actions";
import { Button, Field, Input } from "./ui";
import { ErrorMessage } from "./error-message";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  const formError =
    state && !state.ok && (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0)
      ? state.error
      : null;

  return (
    <form action={formAction} className="space-y-4">
      {formError && <ErrorMessage message={formError} />}

      <Field
        label="Full name"
        htmlFor="name"
        error={state && !state.ok ? state.fieldErrors?.name : undefined}
      >
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          disabled={isPending}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        error={state && !state.ok ? state.fieldErrors?.email : undefined}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="8–72 characters"
        error={state && !state.ok ? state.fieldErrors?.password : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
      </Field>

      <Field
        label="Registration code"
        htmlFor="code"
        hint="Given to you by your instructor."
        error={state && !state.ok ? state.fieldErrors?.code : undefined}
      >
        <Input
          id="code"
          name="code"
          type="text"
          required
          disabled={isPending}
        />
      </Field>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? "Please wait…" : "Register"}
      </Button>
    </form>
  );
}
