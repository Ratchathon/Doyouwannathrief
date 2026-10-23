"use client";

import { useId } from "react";
import { PROVINCES } from "@/lib/shops/provinces";

/** Province picker that reloads the page for the chosen province. Works without JavaScript via the button. */
export function ProvinceSelect({ action, value }: { action: string; value: string | null }) {
  const id = useId();
  return (
    <form action={action} className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        จังหวัด
      </label>
      <select
        id={id}
        name="province"
        defaultValue={value ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 max-w-[180px] cursor-pointer rounded-full border border-[#3a3e44] bg-[#121316] px-3 text-sm text-fg-soft"
      >
        <option value="">เลือกจังหวัด</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-full border border-[#3a3e44] px-3 text-sm">
          ดู
        </button>
      </noscript>
    </form>
  );
}
