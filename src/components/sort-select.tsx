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
        className="h-11 cursor-pointer rounded-full border border-[#3a3e44] bg-[#121316] px-4 font-label text-[13px] font-semibold tracking-[0.06em] text-fg-soft"
      >
        {OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-11 rounded-full border border-[#3a3e44] px-4 font-label text-[13px]">
          APPLY
        </button>
      </noscript>
    </>
  );
}
