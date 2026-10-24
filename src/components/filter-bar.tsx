"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { CATEGORIES, type Category } from "@/lib/products/listing";
import { PROVINCES } from "@/lib/shops/provinces";
import { PRICE_PRESETS, activeFilters, clearHref, filterHref, priceLabel, readBaht } from "@/lib/search/filters";
import { listParam } from "@/lib/search/params";
import type { ResultsScope } from "@/lib/search/results";

type Panel = "category" | "size" | "price" | "province";

/** Choices being made before APPLY. Prices are kept as typed text. */
type Draft = { categories: string[]; sizes: string[]; min: string; max: string; province: string };

const chip = "wide inline-flex h-10 cursor-pointer items-center border-2 border-print px-3 text-[11px] whitespace-nowrap";
const off = "bg-sheet text-print hover:bg-highlight";
const on = "bg-print text-white";

function fromParams(params: URLSearchParams): Draft {
  return {
    categories: listParam(params, "category").filter((c) => Object.hasOwn(CATEGORIES, c)),
    sizes: listParam(params, "size"),
    min: readBaht(params.get("min"))?.toString() ?? "",
    max: readBaht(params.get("max"))?.toString() ?? "",
    province: params.get("province") ?? "",
  };
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 7);

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
  const router = useRouter();
  const params = new URLSearchParams(paramString);
  const [open, setOpen] = useState<Panel | null>(null);
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => fromParams(params));
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<Panel, HTMLButtonElement | null>>>({});
  const id = useId();

  const applied = fromParams(params);
  const active = activeFilters(path, params, scope);
  const sizeChoices = [...sizes, ...draft.sizes.filter((s) => !sizes.some((x) => x.toLowerCase() === s.toLowerCase()))];

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

  function openPanel(panel: Panel) {
    if (open === panel) {
      setOpen(null);
      return;
    }
    // Opening from closed starts again from what is applied; switching panels keeps the picks.
    if (open === null) setDraft(fromParams(params));
    setOpen(panel);
  }

  function openSheet() {
    setDraft(fromParams(params));
    setSheet(true);
  }

  function apply() {
    const changes: Record<string, string | null> = {
      size: draft.sizes.join(",") || null,
      min: draft.min || null,
      max: draft.max || null,
      province: draft.province || null,
    };
    if (scope !== "category") changes.category = draft.categories.join(",") || null;
    setOpen(null);
    setSheet(false);
    router.push(filterHref(path, params, changes));
  }

  const panels: { key: Panel; label: string; count: number; value: string | null }[] = [
    ...(scope === "category"
      ? []
      : [{ key: "category" as const, label: "CATEGORY", count: applied.categories.length, value: null }]),
    { key: "size", label: "SIZE", count: applied.sizes.length, value: null },
    { key: "price", label: "PRICE", count: 0, value: priceLabel(readBaht(applied.min), readBaht(applied.max)) },
    { key: "province", label: "PROVINCE", count: 0, value: applied.province || null },
  ];

  const pressable = (pressed: boolean, onClick: () => void, label: string, extra = "") => (
    <button key={label} type="button" aria-pressed={pressed} onClick={onClick} className={`${chip} ${extra} ${pressed ? on : off}`}>
      {label}
    </button>
  );

  function renderChoices(panel: Panel) {
    if (panel === "category") {
      return (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORIES) as Category[]).map((c) =>
            pressable(draft.categories.includes(c), () => setDraft({ ...draft, categories: toggle(draft.categories, c) }), CATEGORIES[c].en),
          )}
        </div>
      );
    }
    if (panel === "size") {
      if (sizeChoices.length === 0) return <p className="text-sm text-muted">ไม่มีไซซ์ให้เลือกในผลลัพธ์นี้</p>;
      return (
        <>
          <p className="mb-2.5 text-xs text-faint">เลือกได้หลายไซซ์ · เฉพาะไซซ์ที่มีในผลลัพธ์ตอนนี้</p>
          <div className="flex flex-wrap gap-2">
            {sizeChoices.map((s) =>
              pressable(
                draft.sizes.some((x) => x.toLowerCase() === s.toLowerCase()),
                () => {
                  const has = draft.sizes.find((x) => x.toLowerCase() === s.toLowerCase());
                  setDraft({ ...draft, sizes: has ? draft.sizes.filter((x) => x !== has) : [...draft.sizes, s] });
                },
                s,
                "min-w-12 justify-center",
              ),
            )}
          </div>
        </>
      );
    }
    if (panel === "price") {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            {PRICE_PRESETS.map((p) => {
              const min = p.min?.toString() ?? "";
              const max = p.max?.toString() ?? "";
              const current = draft.min === min && draft.max === max;
              return pressable(
                current,
                () => setDraft({ ...draft, min: current ? "" : min, max: current ? "" : max }),
                priceLabel(p.min, p.max)!,
              );
            })}
          </div>
          <div className="mt-4 flex items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col text-xs text-muted">
              ราคาต่ำสุด (บาท)
              <input
                inputMode="numeric"
                value={draft.min}
                onChange={(e) => setDraft({ ...draft, min: digits(e.target.value) })}
                className="field mt-1 h-11 text-base"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-xs text-muted">
              ราคาสูงสุด (บาท)
              <input
                inputMode="numeric"
                value={draft.max}
                onChange={(e) => setDraft({ ...draft, max: digits(e.target.value) })}
                className="field mt-1 h-11 text-base"
              />
            </label>
          </div>
        </>
      );
    }
    return (
      <>
        <label htmlFor={`${id}-province-${sheet ? "s" : "d"}`} className="sr-only">
          จังหวัด
        </label>
        <select
          id={`${id}-province-${sheet ? "s" : "d"}`}
          value={draft.province}
          onChange={(e) => setDraft({ ...draft, province: e.target.value })}
          className="h-11 w-full cursor-pointer border-2 border-print bg-sheet px-3 text-print"
        >
          <option value="">ทุกจังหวัด</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </>
    );
  }

  const applyButton = (className = "") => (
    <button type="button" onClick={apply} className={`btn ${className}`}>
      APPLY
    </button>
  );

  return (
    <div ref={root} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div role="group" aria-label="ตัวกรอง" className="relative hidden flex-wrap gap-2 md:flex">
        {panels.map((p) => {
          const shown = p.value ?? (p.count > 0 ? String(p.count) : null);
          return (
            <button
              key={p.key}
              ref={(el) => {
                buttons.current[p.key] = el;
              }}
              type="button"
              aria-expanded={open === p.key}
              aria-controls={`${id}-${p.key}`}
              onClick={() => openPanel(p.key)}
              className={`${chip} gap-1.5 ${shown ? "bg-highlight text-print" : off}`}
            >
              {shown ? `${p.label} · ${shown}` : p.label}
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          );
        })}
        {open && (
          <div
            id={`${id}-${open}`}
            role="region"
            aria-label={panels.find((p) => p.key === open)!.label}
            className="absolute top-12 left-0 z-30 w-[360px] border-2 border-print bg-paper p-4 shadow-[0_18px_30px_rgba(17,17,17,0.14)]"
          >
            {renderChoices(open)}
            <div className="mt-4 flex justify-end">{applyButton("h-11 px-7")}</div>
          </div>
        )}
      </div>

      <button type="button" onClick={openSheet} className={`${chip} ${on} md:hidden`}>
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
                  className="wide inline-flex h-8 items-center gap-1.5 bg-highlight px-2.5 text-[11px] hover:bg-print hover:text-white"
                >
                  {f.label}
                  <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M1 1l8 8M9 1L1 9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={clearHref(path, params)}
            className="wide inline-flex h-8 items-center px-1 text-[11px] underline underline-offset-4 hover:text-magenta-strong"
          >
            CLEAR ALL
          </Link>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-print/45" onClick={() => setSheet(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ตัวกรอง"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col border-t-2 border-print bg-paper"
          >
            <div className="overflow-y-auto px-4 pt-2.5">
              <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 bg-print" />
              <div className="flex items-center justify-between">
                <p className="cond text-[40px] leading-none">FILTER</p>
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={() => setSheet(false)}
                  className="inline-flex size-11 items-center justify-center text-print"
                >
                  <CloseIcon />
                </button>
              </div>
              {panels.map((p) => (
                <section key={p.key} className="mt-5 pb-1">
                  <p className="label-wide mb-2.5 border-b-2 border-print pb-1.5">{p.label}</p>
                  {renderChoices(p.key)}
                </section>
              ))}
            </div>
            {/* Sticky actions so APPLY is always one tap away. */}
            <div className="flex gap-2.5 border-t-2 border-print px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setDraft({ categories: [], sizes: [], min: "", max: "", province: "" })}
                className="btn-outline h-[52px] flex-1"
              >
                CLEAR
              </button>
              {applyButton("h-[52px] flex-[2]")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
