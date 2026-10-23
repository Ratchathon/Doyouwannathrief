"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { CATEGORIES, type Category } from "@/lib/products/listing";

export type Suggestions = {
  brands: { name: string }[];
  shops: { slug: string; name: string; province: string; match_count: number }[];
  styles: { slug: string; name_en: string; name_th: string }[];
  categories: { value: string; count: number }[];
};

type Option = { key: string; label: string; detail?: string; href: string };
type Group = { name: string; options: Option[] };

const MIN_CHARS = 2;

async function defaultFetch(query: string): Promise<Suggestions> {
  const { createClient } = await import("@/lib/supabase/client");
  const { data, error } = await createClient().rpc("search_suggest", { p_query: query });
  if (error || !data) throw new Error("suggestions unavailable");
  return data as Suggestions;
}

function toGroups(s: Suggestions, query: string): Group[] {
  const groups: Group[] = [
    {
      name: "BRANDS",
      options: s.brands.map((b) => ({
        key: `b:${b.name}`,
        label: b.name.toUpperCase(),
        href: `/search?${new URLSearchParams({ q: b.name })}`,
      })),
    },
    {
      name: "SHOPS",
      options: s.shops.map((shop) => ({
        key: `s:${shop.slug}`,
        label: shop.name,
        detail: shop.match_count > 0 ? `${shop.province} · ${shop.match_count} ชิ้น` : shop.province,
        href: `/${shop.slug}`,
      })),
    },
    {
      name: "STYLES",
      options: s.styles.map((st) => ({
        key: `st:${st.slug}`,
        label: st.name_en.toUpperCase(),
        detail: st.name_th,
        href: `/styles/${st.slug}`,
      })),
    },
    {
      name: "CATEGORIES",
      options: s.categories
        .filter((c) => Object.hasOwn(CATEGORIES, c.value))
        .map((c) => ({
          key: `c:${c.value}`,
          label: CATEGORIES[c.value as Category].en,
          detail: `${c.count} ชิ้น`,
          href: `/categories/${c.value}?${new URLSearchParams({ q: query })}`,
        })),
    },
  ];
  return groups.filter((g) => g.options.length > 0);
}

export function SearchBox({
  defaultValue = "",
  fetchSuggestions = defaultFetch,
  debounceMs = 200,
  autoFocus = false,
  size = "large",
}: {
  defaultValue?: string;
  fetchSuggestions?: (query: string) => Promise<Suggestions>;
  debounceMs?: number;
  autoFocus?: boolean;
  size?: "large" | "compact";
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [result, setResult] = useState<{ query: string; groups: Group[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);

  const query = value.trim();
  const groups = useMemo(() => (result && result.query === query ? result.groups : []), [result, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const expanded = open && flat.length > 0;

  useEffect(() => {
    if (!open || query.length < MIN_CHARS) return;
    const request = ++latest.current;
    const timer = setTimeout(() => {
      fetchSuggestions(query)
        .then((s) => {
          if (request === latest.current) setResult({ query, groups: toGroups(s, query) });
        })
        .catch(() => {
          if (request === latest.current) setResult({ query, groups: [] });
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [open, query, fetchSuggestions, debounceMs]);

  const optionId = (i: number) => `${id}-opt-${i}`;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!expanded) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        const next = i + step;
        if (next >= flat.length) return -1;
        if (next < -1) return flat.length - 1;
        return next;
      });
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(flat[active].href);
    }
  }

  const large = size === "large";
  const starts = groups.map((_, g) => groups.slice(0, g).reduce((n, x) => n + x.options.length, 0));

  return (
    <form
      role="search"
      action="/search"
      className="relative flex w-full items-center gap-2.5"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label htmlFor={`${id}-q`} className="sr-only">
        ค้นหา
      </label>
      <input
        id={`${id}-q`}
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="ลองค้น polo, ลีวายส์ หรือชื่อร้าน"
        className={`field-line flex-1 ${large ? "h-[52px] text-center text-[17px]" : "h-11 text-base"}`}
      />
      {large ? (
        <button type="submit" className="btn-chrome h-[50px] px-6 md:px-7">
          SEARCH
        </button>
      ) : (
        <button type="submit" aria-label="ค้นหา" className="inline-flex size-11 items-center justify-center text-fg">
          <SearchIcon />
        </button>
      )}

      {expanded && (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label="คำแนะนำ"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto border border-line bg-ink-raised py-2 text-left shadow-[0_24px_40px_rgba(0,0,0,0.5)]"
        >
          {groups.map((group, g) => (
            <div key={group.name} role="group" aria-label={group.name} className="py-1">
              <p aria-hidden="true" className="label-caps px-4 pt-2 pb-1">
                {group.name}
              </p>
              {group.options.map((option, o) => {
                const i = starts[g] + o;
                return (
                  <div
                    key={option.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={active === i}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    className={active === i ? "bg-[#202328]" : ""}
                  >
                    <Link
                      href={option.href}
                      tabIndex={-1}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-baseline justify-between gap-4 px-4 py-2"
                    >
                      <span className="font-display text-lg tracking-[0.02em]">{option.label}</span>
                      {option.detail && <span className="shrink-0 text-sm text-muted">{option.detail}</span>}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
