"use client";

import { useActionState, useId } from "react";
import { REPORT_STATUS_LABELS } from "@/lib/reports/report";

type State = { error: string | null };
type Action = (state: State | null, form: FormData) => Promise<State>;

function Done({ state }: { state: State | null }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="bg-highlight px-2 py-1 text-sm">
      {state.error}
    </p>
  ) : (
    <p role="status" className="text-sm font-semibold">
      บันทึกแล้ว
    </p>
  );
}

export function ShopReviewForm({ action, shopId }: { action: Action; shopId: string }) {
  const [state, submit, pending] = useActionState(action, null);
  const id = useId();
  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="shopId" value={shopId} />
      <label htmlFor={id} className="text-sm font-semibold">
        เหตุผลถ้าตีกลับ (ร้านจะเห็นข้อความนี้)
      </label>
      <textarea id={id} name="reason" rows={2} className="border-2 border-print bg-sheet px-3 py-2" />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="approve" disabled={pending} className="btn h-10 px-5 text-[11px]">
          APPROVE
        </button>
        <button type="submit" name="decision" value="reject" disabled={pending} className="btn-outline h-10 px-5 text-[11px]">
          REJECT
        </button>
      </div>
      <Done state={state} />
    </form>
  );
}

export function ReportUpdateForm({ action, reportId, status, note }: { action: Action; reportId: string; status: string; note?: string | null }) {
  const [state, submit, pending] = useActionState(action, null);
  const statusId = useId();
  const noteId = useId();
  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <div>
        <label htmlFor={statusId} className="mb-1 block text-sm font-semibold">
          สถานะ
        </label>
        <select id={statusId} name="status" defaultValue={status} className="h-10 border-2 border-print bg-sheet px-2">
          {Object.entries(REPORT_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={noteId} className="mb-1 block text-sm font-semibold">
          บันทึกของแอดมิน
        </label>
        <textarea id={noteId} name="note" rows={2} defaultValue={note ?? ""} className="w-full border-2 border-print bg-sheet px-3 py-2" />
      </div>
      <button type="submit" disabled={pending} className="btn h-10 self-start px-5 text-[11px]">
        SAVE
      </button>
      <Done state={state} />
    </form>
  );
}
