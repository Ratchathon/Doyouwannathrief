import Link from "next/link";
import { WORDMARK } from "@/lib/config";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { NewsletterForm, type NewsletterAction } from "@/components/newsletter-form";

// Platform home pages until the brand's own accounts exist.
const SOCIAL = [
  { name: "Instagram", href: "https://www.instagram.com/", Icon: InstagramIcon },
  { name: "TikTok", href: "https://www.tiktok.com/", Icon: TikTokIcon },
  { name: "Facebook", href: "https://www.facebook.com/", Icon: FacebookIcon },
];

const COLUMNS = [
  {
    title: "CUSTOMER SERVICE",
    links: [
      ["HOW TO BUY", "/how-to"],
      ["AUTHENTICITY CHECK", "/how-to#authenticity"],
      ["REPORT A PROBLEM", "/report"],
      ["FAQS", "/how-to#faq"],
    ],
  },
  {
    title: "SHIPPING",
    links: [
      ["SHIPPING POLICY", "/how-to#shipping"],
      ["ORDER TRACKING", "/account/orders"],
      ["RETURNS", "/how-to#returns"],
    ],
  },
  {
    title: "CONTACT US",
    links: [
      ["ABOUT US", "/about"],
      ["OPEN YOUR SHOP", "/sell/apply"],
      ["CONTACT", "/contact"],
    ],
  },
] as const;

const heading = "mb-1.5 font-display text-xl tracking-[0.04em] text-fg";
const link = "inline-flex min-h-8 items-center text-fg-soft hover:text-fg";

export function SiteFooter({ year, newsletterAction }: { year: number; newsletterAction?: NewsletterAction }) {
  return (
    <footer className="mt-auto font-label">
      <div className="flex flex-wrap items-center justify-center gap-8 border-y border-line px-4 py-11 md:px-10">
        <div className="text-center">
          <h2 className="chrome-text font-display text-[32px] leading-none font-normal tracking-[0.02em] md:text-[44px]">
            SIGN UP TO OUR NEWSLETTER
          </h2>
          <p className="label-caps mt-2.5">NEW SHOPS AND WEEKLY PICKS</p>
        </div>
        <NewsletterForm action={newsletterAction} />
      </div>

      <div className="grid grid-cols-2 gap-7 px-4 py-12 text-[13px] font-medium tracking-[0.08em] md:grid-cols-4 md:px-10">
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-1.5">
            <h2 className={heading}>{col.title}</h2>
            {col.links.map(([label, href]) => (
              <Link key={label} href={href} className={link}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
        <div className="flex flex-col gap-1.5">
          <h2 className={heading}>FOLLOW US</h2>
          <div className="flex gap-2">
            {SOCIAL.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                aria-label={name}
                target="_blank"
                rel="noopener noreferrer"
                className="chrome inline-flex size-11 items-center justify-center rounded-full"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="px-4 pt-5 pb-9 text-center text-[11px] tracking-[0.16em] text-faint">
        © {year} {WORDMARK} · ALL RIGHTS RESERVED
      </p>
    </footer>
  );
}
