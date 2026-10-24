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
      ["HOW TO BUY", "/how-it-works"],
      ["AUTHENTICITY CHECK", "/how-it-works#authenticity"],
      ["REPORT A PROBLEM", "/report"],
      ["FAQS", "/how-it-works#faq"],
    ],
  },
  {
    title: "SHIPPING",
    links: [
      ["SHIPPING POLICY", "/how-it-works#shipping"],
      ["ORDER TRACKING", "/account/orders"],
      ["RETURNS", "/how-it-works#returns"],
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

const heading = "wide mb-1.5 text-[13px] tracking-[0.06em] text-white";
const link = "inline-flex min-h-9 items-center text-[#cfcfcf] hover:text-white";

export function SiteFooter({ year, newsletterAction }: { year: number; newsletterAction?: NewsletterAction }) {
  return (
    <footer className="mt-auto bg-print text-white">
      <div className="flex flex-wrap items-end justify-between gap-8 border-b border-[#3a3a3a] px-4 pt-12 pb-11 md:px-10">
        <div>
          <h2 className="cond text-[44px] leading-[0.9] md:text-[64px]">SIGN UP TO OUR NEWSLETTER</h2>
          <p className="wide mt-3 text-[11px] tracking-[0.08em] text-[#cfcfcf]">NEW SHOPS AND WEEKLY PICKS</p>
        </div>
        <NewsletterForm action={newsletterAction} />
      </div>

      <div className="grid grid-cols-2 gap-7 px-4 py-12 text-[15px] md:grid-cols-4 md:px-10">
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-1">
            <h2 className={heading}>{col.title}</h2>
            {col.links.map(([label, href]) => (
              <Link key={label} href={href} className={link}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
        <div className="flex flex-col gap-1">
          <h2 className={heading}>FOLLOW US</h2>
          <div className="flex gap-2">
            {SOCIAL.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                aria-label={name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-11 items-center justify-center border-2 border-white text-white hover:bg-white hover:text-print"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-9 md:px-10">
        <p aria-hidden="true" className="cond text-[clamp(44px,12vw,176px)] leading-[0.8] whitespace-nowrap text-magenta-light">
          {WORDMARK}
        </p>
        <p className="wide mt-4 text-[11px] tracking-[0.1em] text-[#b5b5b5]">© {year} {WORDMARK} · ALL RIGHTS RESERVED</p>
      </div>
    </footer>
  );
}
