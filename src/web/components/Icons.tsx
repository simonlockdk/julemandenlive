/** Egne, enkle stregikoner (ingen tredjeparts-ikonsæt). */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconRadar = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 12l6-6" />
    <circle cx="16.5" cy="9" r="1" fill="currentColor" />
  </svg>
);
export const IconCamera = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8l12-3 2 6-12 3z" />
    <path d="M17 9l3-1v5l-3-1" />
    <path d="M8 14l-1 5M5 19h5" />
  </svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M12 13.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 15.3l2-.3z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconReindeer = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3c0 2 1 3 2 3.5M6 4c-.5 1.5 0 3 1.5 3.5M16 3c0 2-1 3-2 3.5M18 4c.5 1.5 0 3-1.5 3.5" />
    <path d="M9 8.5c-1 1.5-1.5 3.5-1 5.5.6 2.5 2.3 4.5 4 4.5s3.4-2 4-4.5c.5-2 0-4-1-5.5-1-.8-2-1-3-1s-2 .2-3 1z" />
    <circle cx="12" cy="17" r="1.4" fill="currentColor" />
    <path d="M10 12h.01M14 12h.01" strokeWidth="2.6" />
  </svg>
);
export const IconStar = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
  </svg>
);
export const IconGift = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
    <path d="M2.5 9h19v-3h-19zM12 6v14" />
    <path d="M12 6c-1.5-3-5-3.5-5-1.2C7 6 9.5 6 12 6zm0 0c1.5-3 5-3.5 5-1.2C17 6 14.5 6 12 6z" />
  </svg>
);
export const IconSnow = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
    <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
  </svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconActivity = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12h4l2-6 4 12 2-6h6" />
  </svg>
);
export const IconBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5" />
    <path d="M9 7.5h7M9 11h5" />
  </svg>
);
export const IconCloud = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 17a4 4 0 01-.5-7.97 5.5 5.5 0 0110.6 1.47A3.5 3.5 0 0117 17z" />
    <path d="M9 20h.01M13 21h.01M16 20h.01" strokeWidth="2.6" />
  </svg>
);
export const IconBulb = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0012 3z" />
  </svg>
);
export const IconMaximize = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
  </svg>
);
export const IconGrid = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
  </svg>
);
export const IconGrid9 = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 3.5h17v17h-17zM9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
  </svg>
);
export const IconSingle = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconTarget = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);
export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
  </svg>
);
export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-6-5.5-6-11a6 6 0 1112 0c0 5.5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);
export const IconArrowLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IconArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);
export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 018 0v3" />
  </svg>
);
export const IconPrint = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 8V3.5h10V8M7 17H4.5V9.5a1.5 1.5 0 011.5-1.5h12a1.5 1.5 0 011.5 1.5V17H17" />
    <rect x="7" y="13.5" width="10" height="7" rx="1" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </svg>
);
export const IconSpark = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </svg>
);
export const IconInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5h.01" strokeWidth="2.2" />
  </svg>
);
export const IconWarn = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5L2.5 20h19z" />
    <path d="M12 10v4.5M12 17.2h.01" strokeWidth="2.2" />
  </svg>
);
export const IconTarget2 = IconTarget;
export const IconMission = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 21V4M5 4h11l-2 3.5L16 11H5" />
  </svg>
);
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21c3.5 0 6-2.4 6-5.8 0-3.6-3-5.7-3.6-9.2-2.6 1.6-3.7 4-3.4 6.4-1.3-.7-2-2-2.2-3.4C6.9 10.8 6 12.8 6 15.2 6 18.6 8.5 21 12 21z" />
  </svg>
);
