"use client";

import { useActionState, useId } from "react";

export type NewsletterState = { status: "idle" | "done" | "error"; message?: string };
export type NewsletterAction = (state: NewsletterState, form: FormData) => Promise<NewsletterState>;

const noop: NewsletterAction = async () => ({ status: "idle" });

export function NewsletterForm({ action = noop }: { action?: NewsletterAction }) {
  const [state, submit, pending] = useActionState(action, { status: "idle" });
  const id = useId();

  if (state.status === "done") {
    return (
      <p role="status" className="flex-[0_1_480px] text-center font-sans text-fg">
        {state.message}
      </p>
    );
  }

  return (
    <form action={submit} className="flex flex-[0_1_480px] flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <label htmlFor={`${id}-email`} className="sr-only">
          อีเมล
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="กรอกอีเมลของคุณ"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? `${id}-error` : undefined}
          className="field-line flex-1 font-sans"
        />
        <button type="submit" disabled={pending} className="btn-chrome px-6 text-base">
          SUBSCRIBE
        </button>
      </div>
      {state.status === "error" && (
        <p id={`${id}-error`} role="alert" className="font-sans text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
