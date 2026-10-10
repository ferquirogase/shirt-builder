"use client";
import type { ComponentType } from "react";
import { DropIcon, NumberIcon, RegisteredIcon, ShieldIcon, ShirtIcon, ShortsIcon, type IconProps } from "./icons";

export type SectionId = "diseno" | "colores" | "escudo" | "sponsor" | "texto" | "pantalon";

type SectionDef = { id: SectionId; label: string; shortLabel: string; Icon: ComponentType<IconProps> };

export const SECTIONS: SectionDef[] = [
  { id: "diseno", label: "Diseño", shortLabel: "Diseño", Icon: ShirtIcon },
  { id: "colores", label: "Colores", shortLabel: "Colores", Icon: DropIcon },
  { id: "escudo", label: "Escudo", shortLabel: "Escudo", Icon: ShieldIcon },
  { id: "sponsor", label: "Sponsor", shortLabel: "Sponsor", Icon: RegisteredIcon },
  { id: "texto", label: "Nombre y número", shortLabel: "Texto", Icon: NumberIcon },
  { id: "pantalon", label: "Pantalón", shortLabel: "Pantalón", Icon: ShortsIcon },
];

type Props = { active: SectionId; onChange: (id: SectionId) => void };

// One element, two layouts: bottom tab bar below `md`, left sidebar from `md` up.
export function SectionNav({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Secciones"
      className="flex justify-around border-t border-line bg-white px-2 py-1 md:w-48 md:flex-col md:justify-start md:gap-1 md:border-0 md:bg-transparent md:p-3"
    >
      {SECTIONS.map(({ id, label, shortLabel, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onChange(id)}
            className={[
              "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
              "md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:px-4 md:py-3 md:text-sm",
              isActive
                ? "bg-accent-soft font-semibold text-foreground"
                : "text-muted hover:text-foreground md:hover:bg-black/5",
            ].join(" ")}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="md:hidden">{shortLabel}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
