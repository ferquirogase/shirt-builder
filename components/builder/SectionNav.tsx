"use client";

export type SectionId = "prendas" | "diseno" | "colores" | "escudo" | "sponsor" | "texto";

type SectionDef = { id: SectionId; label: string; shortLabel: string; icon: string };

export const SECTIONS: SectionDef[] = [
  // What to buy is the first choice; the design is built after it.
  { id: "prendas", label: "Prendas", shortLabel: "Prendas", icon: "/icons/sections/prendas.webp" },
  { id: "diseno", label: "Diseño", shortLabel: "Diseño", icon: "/icons/sections/diseno.webp" },
  { id: "colores", label: "Colores", shortLabel: "Colores", icon: "/icons/sections/colores.webp" },
  { id: "escudo", label: "Escudo", shortLabel: "Escudo", icon: "/icons/sections/escudo.webp" },
  { id: "sponsor", label: "Sponsor", shortLabel: "Sponsor", icon: "/icons/sections/sponsor.webp" },
  { id: "texto", label: "Nombre y número", shortLabel: "Texto", icon: "/icons/sections/texto.webp" },
];

type Props = { active: SectionId; onChange: (id: SectionId) => void };

// One element, two layouts: bottom tab bar below `md`, left sidebar from `md` up.
export function SectionNav({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Secciones"
      className="flex justify-around border-t border-line bg-white px-2 py-1 md:w-48 md:flex-col md:justify-start md:gap-1 md:border-0 md:bg-transparent md:p-3"
    >
      {SECTIONS.map(({ id, label, shortLabel, icon }) => {
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
              "md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:px-4 md:py-3 md:text-left md:text-sm",
              isActive
                ? "bg-accent-soft font-semibold text-foreground"
                : "text-muted hover:text-foreground md:hover:bg-black/5",
            ].join(" ")}
          >
            {/* Every icon sits in the same square box; `object-contain` keeps any aspect ratio inside it. */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <img src={icon} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="md:hidden">{shortLabel}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
