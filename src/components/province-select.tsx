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
        className="h-10 max-w-[200px] cursor-pointer border-2 border-print bg-sheet px-2.5 text-sm text-print"
      >
        <option value="">เลือกจังหวัด</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn h-10 px-4">
          ดู
        </button>
      </noscript>
    </form>
  );
}
