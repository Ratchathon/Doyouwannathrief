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
      <p role="status" className="flex-[0_1_480px] text-white">
        {state.message}
      </p>
    );
  }

  return (
    <form action={submit} className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:flex-[0_1_480px]">
      <div className="flex items-stretch">
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
          className="field flex-1 border-white"
        />
        <button type="submit" disabled={pending} className="btn bg-magenta-strong hover:bg-white hover:text-print">
          SUBSCRIBE
        </button>
      </div>
      {state.status === "error" && (
        <p id={`${id}-error`} role="alert" className="text-sm text-[#ff9b8f]">
          {state.message}
        </p>
      )}
    </form>
  );
}
