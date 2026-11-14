"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import { Button, Field, Input } from "./ui";
import { ErrorMessage } from "./error-message";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  const formError =
    state && !state.ok && (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0)
      ? state.error
      : null;

  return (
    <form action={formAction} className="space-y-4">
      {formError && <ErrorMessage message={formError} />}

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
        error={state && !state.ok ? state.fieldErrors?.password : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {isPending ? "Please wait…" : "Sign in"}
      </Button>
    </form>
  );
}
