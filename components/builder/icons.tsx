import type { ReactNode } from "react";

export type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const ShirtIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8 3 4 5.5l1.5 4L8 8.5V20h8V8.5l2.5 1 1.5-4L16 3a4 4 0 0 1-8 0z" /></Svg>
);
export const DropIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z" /></Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 5 5.5v5.8c0 4.2 2.8 7.3 7 9.2 4.2-1.9 7-5 7-9.2V5.5L12 3z" /></Svg>
);
export const RegisteredIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M10 16V8h3a2 2 0 0 1 0 4h-3m3 0 2 4" /></Svg>
);
export const NumberIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">10</text>
  </Svg>
);
export const ShortsIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 4h14l1.5 16h-6.2L12 11.5 9.7 20H3.5L5 4z" /></Svg>
);
export const UndoIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>
);
export const RedoIcon = (p: IconProps) => (
  <Svg {...p}><path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></Svg>
);
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 15V4m0 0L8 8m4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14m-6-6 6 6-6 6" /></Svg>
);
export const RotateIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" /></Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const HandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 12V6a1.5 1.5 0 0 1 3 0v5m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4-2L4.5 14a1.5 1.5 0 0 1 2.3-1.9L8 13" />
  </Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>
);
export const UploadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" /></Svg>
);
