"use client";

import { useActionState, useId } from "react";
import type { ReportFormState } from "@/lib/reports/actions";
import { REPORT_REASONS } from "@/lib/reports/report";

export type ReportTargetInfo = { type: "product" | "shop"; id: string; name: string } | { type: "website" };
type Action = (state: ReportFormState | null, form: FormData) => Promise<ReportFormState>;

const WHAT = { product: "สินค้า", shop: "ร้าน", website: "เว็บไซต์" };

export function ReportForm({ action, target }: { action: Action; target: ReportTargetInfo }) {
  const [state, submit, pending] = useActionState(action, null);
  const detailsId = useId();
  if (state?.sent) {
    return (
      <p role="status" className="bg-highlight px-4 py-3 text-lg font-medium">
        ได้รับเรื่องแล้ว แอดมินจะตรวจสอบ ขอบคุณที่ช่วยดูแลตลาดนี้
      </p>
    );
  }
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={submit} className="flex flex-col gap-6">
      <input type="hidden" name="targetType" value={target.type} />
      <input type="hidden" name="targetId" value={target.type === "website" ? "" : target.id} />
      <p className="border-2 border-print px-3 py-2">
        แจ้งปัญหาเกี่ยวกับ{WHAT[target.type]}
        {target.type !== "website" && <span className="font-semibold">: {target.name}</span>}
      </p>
      {(state?.error || errors.targetType) && (
        <p role="alert" className="bg-highlight px-3 py-2 font-medium">
          {state?.error ?? errors.targetType}
        </p>
      )}
      <fieldset>
        <legend className="label-wide mb-2">REASON</legend>
        <div className="flex flex-col gap-2">
          {Object.entries(REPORT_REASONS[target.type]).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 border-2 border-print bg-sheet px-3 py-2.5 has-checked:bg-highlight">
              <input type="radio" name="reason" value={value} required className="size-4 accent-magenta-strong" />
              {label}
            </label>
          ))}
        </div>
        {errors.reason && <p className="mt-1.5 bg-highlight px-2 py-1 text-sm">{errors.reason}</p>}
      </fieldset>
      <div>
        <label htmlFor={detailsId} className="label-wide mb-1.5 block">
          เล่ารายละเอียด
        </label>
        <textarea id={detailsId} name="details" required minLength={10} maxLength={2000} rows={5} className="w-full border-2 border-print bg-sheet px-3.5 py-2.5" />
        {errors.details && <p className="mt-1.5 bg-highlight px-2 py-1 text-sm">{errors.details}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn h-[52px] self-start px-8">
        SEND REPORT
      </button>
    </form>
  );
}
