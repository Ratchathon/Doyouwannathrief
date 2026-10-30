"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { FormError, StylePicker, TextArea, TextField } from "@/components/sell/fields";
import type { ListingState } from "@/lib/products/actions";
import {
  CATEGORIES,
  CONDITIONS,
  MAX_STYLES,
  MEASUREMENT_LABELS,
  REQUIRED_MEASUREMENTS,
  type Category,
  type ListingInput,
  type Measurement,
} from "@/lib/products/listing";

export type ListingAction = (state: ListingState | null, form: FormData) => Promise<ListingState>;

const MEASUREMENTS: Measurement[] = ["chest", "length", "shoulder", "waist"];

export function ListingForm({
  action,
  styles,
  productId,
  initial,
}: {
  action: ListingAction;
  styles: { slug: string; name_en: string }[];
  productId?: string;
  initial?: ListingInput;
}) {
  const [state, submit, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.fieldErrors ?? {};
  const [category, setCategory] = useState(values?.category ?? "");
  const [hasFlaws, setHasFlaws] = useState(values?.hasFlaws ?? false);
  const ids = { category: useId(), condition: useId(), flaws: useId() };
  const needed = Object.hasOwn(REQUIRED_MEASUREMENTS, category) ? REQUIRED_MEASUREMENTS[category as Category] : [];
  const key = state?.values ? JSON.stringify(state.values) : "initial";

  return (
    <form key={key} action={submit} className="flex flex-col gap-6">
      {productId && <input type="hidden" name="productId" value={productId} />}
      <FormError message={state?.error} />
      {state?.saved && (
        <p role="status" className="bg-highlight px-3 py-2 font-medium">
          บันทึกแล้ว
        </p>
      )}
      <TextField label="ชื่อสินค้า" name="title" defaultValue={values?.title} error={errors.title} required maxLength={120} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="แบรนด์ (ไม่บังคับ)" name="brand" defaultValue={values?.brand} error={errors.brand} maxLength={60} />
        <div>
          <label htmlFor={ids.category} className="label-wide mb-1.5 block">
            หมวด
          </label>
          <select
            id={ids.category}
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 w-full cursor-pointer border-2 border-print bg-sheet px-3 text-base"
          >
            <option value="">เลือกหมวด</option>
            {(Object.keys(CATEGORIES) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].en} · {CATEGORIES[c].th}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1.5 bg-highlight px-2 py-1 text-sm font-medium">{errors.category}</p>}
        </div>
        <TextField label="ไซซ์ตามป้าย" name="sizeLabel" defaultValue={values?.sizeLabel} error={errors.sizeLabel} required maxLength={20} />
        <TextField label="ราคา (บาท)" name="price" inputMode="numeric" defaultValue={values?.price} error={errors.price} required />
      </div>

      <fieldset>
        <legend className="label-wide mb-2">ขนาดวัดจริง (ซม.) · ช่องที่มี * ต้องใส่สำหรับหมวดนี้</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {MEASUREMENTS.map((m) => (
            <MeasureField key={m} measure={m} required={needed.includes(m)} defaultValue={values?.[m]} error={errors[m]} />
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={ids.condition} className="label-wide mb-1.5 block">
          สภาพ
        </label>
        <select
          id={ids.condition}
          name="condition"
          required
          defaultValue={values?.condition ?? ""}
          className="h-12 w-full cursor-pointer border-2 border-print bg-sheet px-3 text-base sm:w-1/2"
        >
          <option value="">เลือกสภาพ</option>
          {Object.entries(CONDITIONS).map(([v, th]) => (
            <option key={v} value={v}>
              {th}
            </option>
          ))}
        </select>
        {errors.condition && <p className="mt-1.5 bg-highlight px-2 py-1 text-sm font-medium">{errors.condition}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <label className="inline-flex cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            name="hasFlaws"
            checked={hasFlaws}
            onChange={(e) => setHasFlaws(e.target.checked)}
            className="size-5 accent-magenta-strong"
          />
          มีตำหนิ (ต้องถ่ายรูปตำหนิด้วย)
        </label>
        {hasFlaws && <TextArea label="ตำหนิคืออะไร อยู่ตรงไหน" name="flawsNote" defaultValue={values?.flawsNote} error={errors.flawsNote} required rows={2} />}
      </div>

      <TextArea label="รายละเอียดเพิ่มเติม (ไม่บังคับ)" name="description" defaultValue={values?.description} error={errors.description} maxLength={2000} />
      <StylePicker styles={styles} selected={values?.styles ?? []} error={errors.styles} max={MAX_STYLES} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn h-[52px] px-8">
          {pending ? "SAVING…" : productId ? "SAVE" : "NEXT: PHOTOS"}
        </button>
        <Link href="/sell/products" className="btn-outline h-[52px]">
          CANCEL
        </Link>
      </div>
    </form>
  );
}

function MeasureField({ measure, required, defaultValue, error }: { measure: Measurement; required: boolean; defaultValue?: string; error?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {MEASUREMENT_LABELS[measure]}
        {required ? " *" : ""}
      </label>
      <input id={id} name={measure} inputMode="decimal" required={required} defaultValue={defaultValue} className="field w-full text-base" />
      {error && <p className="mt-1 bg-highlight px-2 py-0.5 text-[13px] font-medium">{error}</p>}
    </div>
  );
}
