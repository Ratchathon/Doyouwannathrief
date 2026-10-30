"use client";

import { useActionState, useId, useState } from "react";
import { FormError, StylePicker, TextArea, TextField } from "@/components/sell/fields";
import type { ApplyState } from "@/lib/shops/actions";
import { MAX_SOCIAL_LINKS, MAX_STYLES } from "@/lib/shops/application";
import { PROVINCES } from "@/lib/shops/provinces";

export type ApplyAction = (state: ApplyState | null, form: FormData) => Promise<ApplyState>;

export function ApplyForm({ action, styles }: { action: ApplyAction; styles: { slug: string; name_en: string }[] }) {
  const [state, submit, pending] = useActionState(action, null);
  const values = state?.values;
  const errors = state?.fieldErrors ?? {};
  const [slug, setSlug] = useState(values?.slug ?? "");
  const provinceId = useId();
  // A failed submit re-renders with what was sent; the key makes the inputs take those values.
  const key = values ? JSON.stringify(values) : "blank";

  return (
    <form key={key} action={submit} className="flex flex-col gap-6">
      <FormError message={state?.error} />
      <TextField label="ชื่อร้าน" name="displayName" defaultValue={values?.displayName} error={errors.displayName} required maxLength={80} />
      <div>
        <TextField
          label="ลิงก์ร้าน (ภาษาอังกฤษ)"
          name="slug"
          defaultValue={values?.slug}
          error={errors.slug}
          required
          hint="a–z ตัวเลข และขีดกลาง 3–30 ตัว ใช้เป็นที่อยู่หน้าร้าน"
          onChange={setSlug}
          maxLength={30}
        />
        <p className="mt-1 text-sm">
          ที่อยู่ร้าน: <span className="font-semibold">doyouwannathrift.vercel.app/{slug.trim().toLowerCase() || "…"}</span>
        </p>
      </div>
      <div>
        <label htmlFor={provinceId} className="label-wide mb-1.5 block">
          จังหวัด
        </label>
        <select
          id={provinceId}
          name="province"
          required
          defaultValue={values?.province ?? ""}
          className="h-12 w-full cursor-pointer border-2 border-print bg-sheet px-3 text-base"
        >
          <option value="">เลือกจังหวัด</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {errors.province && <p className="mt-1.5 bg-highlight px-2 py-1 text-sm font-medium">{errors.province}</p>}
      </div>
      <TextArea label="แนะนำร้าน" name="bio" defaultValue={values?.bio} error={errors.bio} maxLength={500} />
      <StylePicker styles={styles} selected={values?.styles ?? []} error={errors.styles} max={MAX_STYLES} />
      <fieldset className="flex flex-col gap-3">
        <legend className="label-wide mb-1">ลิงก์ร้านใน Instagram / TikTok / Facebook</legend>
        {Array.from({ length: MAX_SOCIAL_LINKS }, (_, i) => (
          <TextField
            key={i}
            label={`ลิงก์โซเชียล ${i + 1}${i === 0 ? "" : " (ไม่บังคับ)"}`}
            name="socialLinks"
            type="url"
            inputMode="url"
            defaultValue={values?.socialLinks[i]}
            required={i === 0}
          />
        ))}
        {errors.socialLinks && <p className="bg-highlight px-2 py-1 text-sm font-medium">{errors.socialLinks}</p>}
      </fieldset>
      <button type="submit" disabled={pending} className="btn h-[52px] self-start px-8">
        {pending ? "SENDING…" : "SEND APPLICATION"}
      </button>
    </form>
  );
}
