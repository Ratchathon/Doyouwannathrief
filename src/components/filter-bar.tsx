"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { CATEGORIES, type Category } from "@/lib/products/listing";
import { PROVINCES } from "@/lib/shops/provinces";
import { PRICE_PRESETS, activeFilters, clearHref, filterHref, priceLabel, readBaht } from "@/lib/search/filters";
import type { ResultsScope } from "@/lib/search/results";

type Panel = "category" | "size" | "price" | "province";

const chip =
  "inline-flex h-10 items-center rounded-full px-3.5 font-label text-[13px] font-semibold tracking-[0.06em] whitespace-nowrap";
const off = "border border-[#3a3e44] text-fg-soft hover:border-muted";
const on = "chrome";
const sectionTitle = "label-caps mb-2.5";

function HiddenParams({ params, skip }: { params: URLSearchParams; skip: string[] }) {
  return (
    <>
      {[...params]
        .filter(([k]) => !skip.includes(k) && k !== "page")
        .map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
    </>
  );
}

export function FilterBar({
  path,
  params: paramString,
  scope,
  sizes,
}: {
  path: string;
  params: string;
  scope: ResultsScope["kind"];
  sizes: string[];
}) {
  const params = new URLSearchParams(paramString);
  const [open, setOpen] = useState<Panel | null>(null);
  const [sheet, setSheet] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<Panel, HTMLButtonElement | null>>>({});
  const id = useId();

  const category = params.get("category");
  const size = params.get("size");
  const min = readBaht(params.get("min"));
  const max = readBaht(params.get("max"));
  const province = params.get("province");
  const active = activeFilters(path, params, scope);

  useEffect(() => {
    if (!open && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) buttons.current[open]?.focus();
      setOpen(null);
      setSheet(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (open && !root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, sheet]);

  const close = () => {
    setOpen(null);
    setSheet(false);
  };

  const panels: { key: Panel; label: string; value: string | null }[] = [
    ...(scope === "category"
      ? []
      : [{ key: "category" as const, label: "CATEGORY", value: category && Object.hasOwn(CATEGORIES, category) ? CATEGORIES[category as Category].en : null }]),
    { key: "size", label: "SIZE", value: size },
    { key: "price", label: "PRICE", value: priceLabel(min, max) },
    { key: "province", label: "PROVINCE", value: province },
  ];

  function renderChoices(panel: Panel) {
    if (panel === "category") {
      return (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <Link
              key={c}
              href={filterHref(path, params, { category: category === c ? null : c })}
              aria-current={category === c ? "true" : undefined}
              onClick={close}
              className={`${chip} ${category === c ? on : off}`}
            >
              {CATEGORIES[c].en}
            </Link>
          ))}
        </div>
      );
    }
    if (panel === "size") {
      if (sizes.length === 0) return <p className="text-sm text-muted">ไม่มีไซซ์ให้เลือกในผลลัพธ์นี้</p>;
      return (
        <>
          <p className="mb-2.5 text-xs text-faint">เฉพาะไซซ์ที่มีในผลลัพธ์ตอนนี้</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <Link
                key={s}
                href={filterHref(path, params, { size: size === s ? null : s })}
                aria-current={size === s ? "true" : undefined}
                onClick={close}
                className={`${chip} min-w-12 justify-center ${size === s ? on : off}`}
              >
                {s}
              </Link>
            ))}
          </div>
        </>
      );
    }
    if (panel === "price") {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            {PRICE_PRESETS.map((p) => {
              const label = priceLabel(p.min, p.max)!;
              const current = p.min === min && p.max === max;
              return (
                <Link
                  key={label}
                  href={filterHref(path, params, {
                    min: current || p.min === null ? null : String(p.min),
                    max: current || p.max === null ? null : String(p.max),
                  })}
                  aria-current={current ? "true" : undefined}
                  onClick={close}
                  className={`${chip} ${current ? on : off}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <form action={path} className="mt-4 flex items-end gap-2">
            <HiddenParams params={params} skip={["min", "max"]} />
            <label className="flex min-w-0 flex-1 flex-col text-xs text-muted">
              ราคาต่ำสุด (บาท)
              <input name="min" inputMode="numeric" pattern="[0-9]*" defaultValue={min ?? ""} className="field-line h-10 text-base" />
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-xs text-muted">
              ราคาสูงสุด (บาท)
              <input name="max" inputMode="numeric" pattern="[0-9]*" defaultValue={max ?? ""} className="field-line h-10 text-base" />
            </label>
            <button type="submit" className="btn-chrome h-10 px-4 text-[15px]">
              APPLY
            </button>
          </form>
        </>
      );
    }
    return (
      <form action={path}>
        <HiddenParams params={params} skip={["province"]} />
        <label htmlFor={`${id}-province`} className="sr-only">
          จังหวัด
        </label>
        <select
          id={`${id}-province`}
          name="province"
          defaultValue={province ?? ""}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-11 w-full rounded-lg border border-[#3a3e44] bg-[#121316] px-3 text-fg-soft"
        >
          <option value="">ทุกจังหวัด</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit" className="mt-2 h-10 rounded-full border border-[#3a3e44] px-4">
            APPLY
          </button>
        </noscript>
      </form>
    );
  }

  return (
    <div ref={root} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div role="group" aria-label="ตัวกรอง" className="relative hidden flex-wrap gap-2 md:flex">
        {panels.map((p) => (
          <button
            key={p.key}
            ref={(el) => {
              buttons.current[p.key] = el;
            }}
            type="button"
            aria-expanded={open === p.key}
            aria-controls={`${id}-${p.key}`}
            onClick={() => setOpen(open === p.key ? null : p.key)}
            className={`${chip} cursor-pointer gap-1.5 ${p.value ? "border border-fg text-fg" : off}`}
          >
            {p.value ? `${p.label} · ${p.value}` : p.label}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        ))}
        {open && (
          <div
            id={`${id}-${open}`}
            role="region"
            aria-label={panels.find((p) => p.key === open)!.label}
            className="absolute top-12 left-0 z-30 w-[340px] border border-line bg-ink-raised p-4 shadow-[0_24px_40px_rgba(0,0,0,0.5)]"
          >
            {renderChoices(open)}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setSheet(true)} className={`${chip} chrome cursor-pointer md:hidden`}>
        {active.length > 0 ? `FILTER · ${active.length}` : "FILTER"}
      </button>

      {active.length > 0 && (
        <div className="flex basis-full flex-wrap items-center gap-2 pt-1">
          <ul aria-label="ตัวกรองที่เลือก" className="flex flex-wrap gap-2">
            {active.map((f) => (
              <li key={f.key}>
                <Link
                  href={f.removeHref}
                  aria-label={`เอาออก ${f.label}`}
                  className="chrome inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-label text-xs font-semibold"
                >
                  {f.label}
                  <span aria-hidden="true">✕</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={clearHref(path, params)}
            className="inline-flex h-8 items-center px-1 font-label text-xs font-semibold text-fg-soft underline underline-offset-4"
          >
            CLEAR ALL
          </Link>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-black/55" onClick={() => setSheet(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ตัวกรอง"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-ink-raised px-4 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))]"
          >
            <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded bg-[#3a3e44]" />
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl">FILTER</p>
              <button
                type="button"
                aria-label="ปิด"
                onClick={() => setSheet(false)}
                className="inline-flex size-11 items-center justify-center text-fg"
              >
                <CloseIcon />
              </button>
            </div>
            {panels.map((p) => (
              <section key={p.key} className="mt-5">
                <p className={sectionTitle}>{p.label}</p>
                {renderChoices(p.key)}
              </section>
            ))}
            <div className="mt-6 flex gap-2.5">
              <Link href={clearHref(path, params)} onClick={close} className={`${chip} ${off} h-[50px] flex-1 justify-center font-display text-base`}>
                CLEAR
              </Link>
              <button type="button" onClick={() => setSheet(false)} className="btn-chrome h-[50px] flex-[2] text-base">
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
