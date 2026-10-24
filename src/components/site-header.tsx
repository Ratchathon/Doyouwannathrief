"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { WORDMARK } from "@/lib/config";
import { AccountIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

export type NavStyle = { slug: string; name_en: string; name_th?: string };
export type NavShop = { slug: string; display_name: string; province: string };

type Menu = "styles" | "shops";

const MENU_LABEL: Record<Menu, string> = { styles: "STYLES", shops: "SHOPS" };

const navLink = "inline-flex h-11 items-center text-print hover:text-magenta-strong";
const iconLink = "inline-flex size-11 items-center justify-center text-print hover:text-magenta-strong";

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="cond text-center text-[30px] leading-none text-magenta md:text-[36px]">
      {WORDMARK}
    </Link>
  );
}

/** The homepage masthead is the wordmark there, so the bar shows the issue line instead. */
function HeaderCenter({ issue, onNavigate }: { issue: string; onNavigate: () => void }) {
  return usePathname() === "/" ? (
    <p className="wide text-[11px] tracking-[0.14em]">{issue}</p>
  ) : (
    <Wordmark onNavigate={onNavigate} />
  );
}

export function SiteHeader({ styles, shops, issue }: { styles: NavStyle[]; shops: NavShop[]; issue: string }) {
  const [open, setOpen] = useState<Menu | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttons = useRef<Record<Menu, HTMLButtonElement | null>>({ styles: null, shops: null });
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const mobilePanel = useRef<HTMLDivElement>(null);
  const baseId = useId();

  // Close the desktop menu on Escape (returning focus) or a click outside the header.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      buttons.current[open]?.focus();
    };
    const onPointer = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  // Mobile menu: Escape closes, page behind does not scroll, focus moves in and back.
  useEffect(() => {
    if (!mobileOpen) return;
    const toggle = mobileToggle.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobilePanel.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      toggle?.focus();
    };
  }, [mobileOpen]);

  const closeAll = () => {
    setOpen(null);
    setMobileOpen(false);
  };

  return (
    <header ref={headerRef} className="relative z-40 bg-paper">
      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b-2 border-print px-2 md:h-16 md:px-10">
        {/* Left: desktop nav / mobile menu button */}
        <nav aria-label="Main" className="wide hidden flex-wrap items-center gap-7 text-xs tracking-[0.06em] md:flex">
          <Link href="/discover" className={navLink} onClick={closeAll}>
            DISCOVER
          </Link>
          {(Object.keys(MENU_LABEL) as Menu[]).map((menu) => (
            <button
              key={menu}
              ref={(el) => {
                buttons.current[menu] = el;
              }}
              type="button"
              aria-expanded={open === menu}
              aria-controls={`${baseId}-${menu}`}
              onClick={() => setOpen(open === menu ? null : menu)}
              className={`${navLink} cursor-pointer gap-1.5 ${open === menu ? "text-magenta-strong" : ""}`}
            >
              {MENU_LABEL[menu]}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
                className={`transition-transform ${open === menu ? "rotate-180" : ""}`}
              >
                <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          ))}
        </nav>
        <div className="md:hidden">
          <button
            ref={mobileToggle}
            type="button"
            aria-label="เมนู"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className={iconLink}
          >
            <MenuIcon />
          </button>
        </div>

        {/* The path is only known per request, so pages that cannot know it ahead show the wordmark. */}
        <Suspense fallback={<Wordmark onNavigate={closeAll} />}>
          <HeaderCenter issue={issue} onNavigate={closeAll} />
        </Suspense>

        <div className="flex items-center justify-end gap-1">
          <Link href="/search" aria-label="ค้นหา" className={iconLink}>
            <SearchIcon />
          </Link>
          <Link href="/account" aria-label="บัญชีของฉัน" className={`${iconLink} hidden md:inline-flex`}>
            <AccountIcon />
          </Link>
        </div>
      </div>

      {open && (
        <div
          id={`${baseId}-${open}`}
          role="region"
          aria-label={MENU_LABEL[open]}
          className="absolute inset-x-0 top-full hidden border-y-2 border-print bg-paper px-10 py-10 shadow-[0_18px_30px_rgba(17,17,17,0.12)] md:block"
        >
          {open === "styles" ? (
            <StyleLinks styles={styles} onNavigate={closeAll} />
          ) : (
            <ShopLinks shops={shops} onNavigate={closeAll} />
          )}
        </div>
      )}

      {mobileOpen && (
        <div
          ref={mobilePanel}
          role="dialog"
          aria-modal="true"
          aria-label="เมนู"
          className="fixed inset-0 z-50 overflow-y-auto bg-paper px-4 pt-1.5 pb-12 md:hidden"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="ปิดเมนู"
              onClick={() => setMobileOpen(false)}
              className={`${iconLink} -ml-2`}
            >
              <CloseIcon />
            </button>
            <Link href="/account" onClick={closeAll} className="wide inline-flex h-11 items-center text-xs tracking-[0.06em]">
              ACCOUNT
            </Link>
          </div>
          <Link href="/discover" onClick={closeAll} className="cond mt-6 block text-[64px] leading-[0.9] text-magenta">
            DISCOVER
          </Link>
          <p className="label-wide mt-10 border-b-2 border-print pb-2">STYLES</p>
          <StyleLinks styles={styles} onNavigate={closeAll} compact />
          <p className="label-wide mt-10 border-b-2 border-print pb-2">SHOPS</p>
          <ShopLinks shops={shops} onNavigate={closeAll} compact />
        </div>
      )}
    </header>
  );
}

function StyleLinks({ styles, onNavigate, compact = false }: { styles: NavStyle[]; onNavigate: () => void; compact?: boolean }) {
  return (
    <ul className={compact ? "flex flex-col" : "mx-auto grid max-w-6xl grid-cols-3 gap-x-10 gap-y-2"}>
      {styles.map((style) => (
        <li key={style.slug}>
          <Link
            href={`/styles/${style.slug}`}
            onClick={onNavigate}
            className={
              compact
                ? "cond flex min-h-14 items-center border-b border-print text-[34px] leading-none"
                : "cond inline-flex min-h-14 items-center text-[46px] leading-none hover:text-magenta-strong"
            }
          >
            {style.name_en.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ShopLinks({ shops, onNavigate, compact = false }: { shops: NavShop[]; onNavigate: () => void; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mx-auto max-w-6xl"}>
      {shops.length === 0 ? (
        <p className="py-4 text-muted">ยังไม่มีร้าน</p>
      ) : (
        <ul className={compact ? "flex flex-col" : "grid grid-cols-2 gap-x-16"}>
          {shops.map((shop) => (
            <li key={shop.slug}>
              <Link
                href={`/${shop.slug}`}
                onClick={onNavigate}
                className="flex min-h-12 items-baseline justify-between gap-4 border-b border-print py-2.5 hover:text-magenta-strong"
              >
                <span className={`wide leading-tight ${compact ? "text-[15px]" : "text-lg"}`}>{shop.display_name}</span>
                <span className="shrink-0 text-sm text-muted">{shop.province}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/shops"
        onClick={onNavigate}
        className="wide mt-6 inline-flex h-11 items-center text-xs tracking-[0.06em] underline underline-offset-4 hover:text-magenta-strong"
      >
        ALL SHOPS
      </Link>
    </div>
  );
}
