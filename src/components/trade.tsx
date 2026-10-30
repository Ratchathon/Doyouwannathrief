"use client";

import { useActionState, useId } from "react";

export type TradeState = { error: string | null; message?: string };
export type TradeAction = (state: TradeState | null, form: FormData) => Promise<TradeState>;

function Result({ state }: { state: TradeState | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="mt-1.5 bg-highlight px-2 py-1 text-sm">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="mt-1.5 text-sm font-semibold">
        {state.message}
      </p>
    );
  return null;
}

function Hidden({ fields }: { fields: Record<string, string> }) {
  return (
    <>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

export function TradeButton({
  action,
  fields,
  label,
  variant = "solid",
}: {
  action: TradeAction;
  fields: Record<string, string>;
  label: string;
  variant?: "solid" | "outline" | "magenta";
}) {
  const [state, submit, pending] = useActionState(action, null);
  const look =
    variant === "outline" ? "btn-outline h-11 px-5 text-[11px]" : variant === "magenta" ? "btn h-[52px] bg-magenta-strong px-8 hover:bg-print" : "btn h-11 px-5 text-[11px]";
  return (
    <form action={submit}>
      <Hidden fields={fields} />
      <button type="submit" disabled={pending} className={look}>
        {pending ? "…" : label}
      </button>
      <Result state={state} />
    </form>
  );
}

export function AmountForm({
  action,
  fields,
  label,
  submit: submitLabel,
  name = "amount",
  inputMode = "numeric",
}: {
  action: TradeAction;
  fields: Record<string, string>;
  label: string;
  submit: string;
  name?: string;
  inputMode?: "numeric" | "text";
}) {
  const [state, submit, pending] = useActionState(action, null);
  const id = useId();
  return (
    <form action={submit} className="flex flex-col gap-1.5">
      <Hidden fields={fields} />
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex">
        <input id={id} name={name} inputMode={inputMode} required className="field h-11 min-w-0 flex-1 border-r-0" />
        <button type="submit" disabled={pending} className="btn h-11 px-4 text-[11px]">
          {submitLabel}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}
