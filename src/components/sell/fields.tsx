"use client";

import { useId } from "react";

/** Small building blocks shared by the shop forms. */

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 bg-highlight px-2 py-1 text-sm font-medium">
      {message}
    </p>
  );
}

export function TextField({
  label,
  name,
  defaultValue,
  error,
  required,
  hint,
  inputMode,
  type = "text",
  onChange,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  inputMode?: "text" | "numeric" | "decimal" | "url";
  type?: "text" | "url";
  onChange?: (value: string) => void;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label-wide mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="field w-full text-base"
      />
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
      <FieldError id={`${id}-e`} message={error} />
    </div>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  error,
  required,
  rows = 4,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label-wide mb-1.5 block">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className="w-full border-2 border-print bg-sheet px-3.5 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-magenta-strong"
      />
      <FieldError id={`${id}-e`} message={error} />
    </div>
  );
}

export function StylePicker({
  styles,
  selected,
  error,
  max,
}: {
  styles: { slug: string; name_en: string }[];
  selected: string[];
  error?: string;
  max: number;
}) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="label-wide mb-2">STYLES · เลือกได้ไม่เกิน {max}</legend>
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <label key={s.slug} className="has-checked:bg-print has-checked:text-white wide inline-flex h-10 cursor-pointer items-center gap-2 border-2 border-print bg-sheet px-3 text-[11px]">
            <input type="checkbox" name="styles" value={s.slug} defaultChecked={selected.includes(s.slug)} className="size-4 accent-magenta-strong" />
            {s.name_en.toUpperCase()}
          </label>
        ))}
      </div>
      <FieldError id={`${id}-e`} message={error} />
    </fieldset>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-highlight px-3 py-2 font-medium">
      {message}
    </p>
  );
}
