"use client";

import { useActionState } from "react";

type State = { error: string | null };
export type ItemAction = (state: State | null, form: FormData) => Promise<State>;

/** A one-tap button that runs a shop action on one item and shows any error under it. */
export function ItemButton({
  action,
  productId,
  label,
  variant = "outline",
  confirm,
}: {
  action: ItemAction;
  productId: string;
  label: string;
  variant?: "solid" | "outline" | "link";
  confirm?: string;
}) {
  const [state, submit, pending] = useActionState(action, null);
  const look =
    variant === "solid" ? "btn h-10 px-4 text-[11px]" : variant === "outline" ? "btn-outline h-10 px-4 text-[11px]" : "text-sm underline underline-offset-4 hover:text-magenta-strong";
  return (
    <form
      action={submit}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" disabled={pending} className={look}>
        {pending ? "…" : label}
      </button>
      {state?.error && (
        <p role="alert" className="mt-1.5 max-w-[280px] bg-highlight px-2 py-1 text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function ResubmitButton({ action, shopId }: { action: ItemAction; shopId: string }) {
  const [state, submit, pending] = useActionState(action, null);
  return (
    <form action={submit}>
      <input type="hidden" name="shopId" value={shopId} />
      <button type="submit" disabled={pending} className="btn">
        SEND AGAIN
      </button>
      {state?.error && (
        <p role="alert" className="mt-2 bg-highlight px-2 py-1">
          {state.error}
        </p>
      )}
    </form>
  );
}
