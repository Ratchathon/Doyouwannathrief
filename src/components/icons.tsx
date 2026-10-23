// Line icons, 24px grid, drawn with currentColor. Decorative: labels live on the control.
type Props = { size?: number };

function Svg({ size = 20, strokeWidth = 1.8, children }: Props & { strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      {children}
    </svg>
  );
}

export const SearchIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);

export const AccountIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Svg>
);

export const MenuIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M3 7h18M3 12h18M3 17h18" />
  </Svg>
);

export const CloseIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M5 5l14 14M19 5L5 19" />
  </Svg>
);

export const InstagramIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" />
  </Svg>
);

export const TikTokIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 3c.5 2.5 2.5 4.5 5 4.5" />
  </Svg>
);

export const FacebookIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />
  </Svg>
);
