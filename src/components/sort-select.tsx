"use client";

import { useId } from "react";

const OPTIONS = [
  ["newest", "NEWEST"],
  ["price_asc", "PRICE LOW–HIGH"],
  ["price_desc", "PRICE HIGH–LOW"],
] as const;

/** Sort dropdown that submits its form on change. Without JavaScript, the button applies it. */
export function SortSelect({ defaultValue }: { defaultValue: string }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        เรียงตาม
      </label>
      <select
        id={id}
        name="sort"
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="wide h-10 cursor-pointer border-2 border-print bg-sheet px-2.5 text-[11px] text-print"
      >
        {OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn h-10 px-4 text-[11px]">
          APPLY
        </button>
      </noscript>
    </>
  );
}
