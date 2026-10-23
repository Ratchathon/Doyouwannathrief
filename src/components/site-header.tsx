"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { WORDMARK } from "@/lib/config";
import { AccountIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

export type NavStyle = { slug: string; name_en: string };
export type NavShop = { slug: string; display_name: string; province: string };

type Menu = "styles" | "shops";

const MENU_LABEL: Record<Menu, string> = { styles: "STYLES", shops: "SHOPS" };

const navLink = "inline-flex h-11 items-center text-fg-soft hover:text-fg";

export function SiteHeader({ styles, shops }: { styles: NavStyle[]; shops: NavShop[] }) {
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
    <header ref={headerRef} className="relative z-40 font-display tracking-nav">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-3 md:px-10 md:py-5">
        {/* Left: desktop nav / mobile menu button */}
        <nav aria-label="Main" className="hidden flex-wrap items-center gap-7 text-[17px] md:flex">
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
              className={`${navLink} cursor-pointer gap-1.5 ${open === menu ? "text-fg" : ""}`}
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
            className="-ml-2 inline-flex size-11 items-center justify-center text-fg-soft"
          >
            <MenuIcon />
          </button>
        </div>

        <Link
          href="/"
          onClick={closeAll}
          className="chrome-text text-center text-[22px] leading-none tracking-[0.02em] sm:text-[28px] md:text-4xl"
        >
          {WORDMARK}
        </Link>

        <div className="flex justify-end gap-1">
          <Link href="/search" aria-label="ค้นหา" className="inline-flex size-11 items-center justify-center text-fg-soft hover:text-fg">
            <SearchIcon />
          </Link>
          <Link
            href="/account"
            aria-label="บัญชีของฉัน"
            className="hidden size-11 items-center justify-center text-fg-soft hover:text-fg md:inline-flex"
          >
            <AccountIcon />
          </Link>
        </div>
      </div>

      {open && (
        <div
          id={`${baseId}-${open}`}
          role="region"
          aria-label={MENU_LABEL[open]}
          className="absolute inset-x-0 top-full hidden border-y border-line bg-ink-raised px-10 py-10 shadow-[0_24px_40px_rgba(0,0,0,0.5)] md:block"
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
          className="fixed inset-0 z-50 overflow-y-auto bg-ink px-4 pb-12 pt-3 md:hidden"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="ปิดเมนู"
              onClick={() => setMobileOpen(false)}
              className="-ml-2 inline-flex size-11 items-center justify-center text-fg-soft"
            >
              <CloseIcon />
            </button>
            <Link href="/account" onClick={closeAll} className="inline-flex h-11 items-center text-[17px] text-fg-soft">
              ACCOUNT
            </Link>
          </div>
          <Link href="/discover" onClick={closeAll} className="mt-6 block text-5xl leading-tight">
            DISCOVER
          </Link>
          <p className="label-caps mt-10 border-b border-line pb-3">STYLES</p>
          <StyleLinks styles={styles} onNavigate={closeAll} compact />
          <p className="label-caps mt-10 border-b border-line pb-3">SHOPS</p>
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
                ? "flex min-h-12 items-center border-b border-line text-2xl"
                : "inline-flex min-h-12 items-center text-[32px] leading-none text-fg-soft hover:text-fg"
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
        <p className="py-4 font-sans tracking-normal text-muted">ยังไม่มีร้าน</p>
      ) : (
        <ul className={compact ? "flex flex-col" : "grid grid-cols-2 gap-x-16"}>
          {shops.map((shop) => (
            <li key={shop.slug}>
              <Link
                href={`/${shop.slug}`}
                onClick={onNavigate}
                className="flex min-h-12 items-baseline justify-between gap-4 border-b border-line py-2 text-fg-soft hover:text-fg"
              >
                <span className={compact ? "text-2xl" : "text-[26px] leading-tight"}>{shop.display_name}</span>
                <span className="shrink-0 font-sans text-sm tracking-normal text-muted">{shop.province}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/discover/shops"
        onClick={onNavigate}
        className="mt-6 inline-flex h-11 items-center text-[17px] tracking-button text-fg underline-offset-8 hover:underline"
      >
        ALL SHOPS
      </Link>
    </div>
  );
}
