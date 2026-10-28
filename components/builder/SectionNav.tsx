"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import type { LookTarget } from "@/lib/builder/state/design-state";

export type NavId = "player" | "keeper" | "shorts" | "crest" | "sponsor";

type Entry = {
  id: NavId;
  label: string;
  shortLabel: string;
  icon: string;
  /** The shirt the viewer shows when this entry is picked; none leaves it as it was. */
  shows?: LookTarget;
  /** Left out of the order until added: the entry offers to add it. */
  optional?: "keeper" | "shorts";
};

// By garment first, then what both shirts share. The keeper and the shorts are here from the
// start, so it is clear they can be added.
const ENTRIES: Entry[] = [
  { id: "player", label: "Camiseta jugador", shortLabel: "Jugador", icon: "/icons/sections/kit-shirt-v2.webp", shows: "player" },
  { id: "keeper", label: "Camiseta arquero", shortLabel: "Arquero", icon: "/icons/sections/kit-gloves.webp", shows: "keeper", optional: "keeper" },
  { id: "shorts", label: "Short", shortLabel: "Short", icon: "/icons/sections/kit-kit.webp", shows: "player", optional: "shorts" },
  { id: "crest", label: "Escudo", shortLabel: "Escudo", icon: "/icons/sections/escudo.webp" },
  { id: "sponsor", label: "Sponsor", shortLabel: "Sponsor", icon: "/icons/sections/sponsor.webp" },
];

const SHARED_FROM: NavId = "crest";

type Props = { active: NavId; onChange: (id: NavId) => void };

// One element, two layouts: bottom tab bar below `md`, left sidebar from `md` up.
export function SectionNav({ active, onChange }: Props) {
  const { state, setEditing } = useDesign();

  return (
    <nav
      aria-label="Secciones"
      className="flex justify-around border-t border-line bg-white px-2 py-1 md:w-48 md:flex-col md:justify-start md:gap-1 md:border-0 md:bg-transparent md:p-3"
    >
      {ENTRIES.map(({ id, label, shortLabel, icon, shows, optional }) => {
        const isActive = id === active;
        const toAdd = optional !== undefined && !state[optional].included;
        return (
          <div key={id} className="contents">
            {id === SHARED_FROM && (
              <p className="hidden px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted md:block">De las dos</p>
            )}
            <button
              type="button"
              aria-label={label}
              aria-current={isActive ? "true" : undefined}
              onClick={() => {
                if (shows) setEditing(shows);
                onChange(id);
              }}
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
              <span className="flex flex-col items-center md:items-start">
                <span className="md:hidden">{shortLabel}</span>
                <span className="hidden md:inline">{label}</span>
                {toAdd && (
                  <span className="rounded-full border border-dashed border-current px-1.5 text-[10px] font-semibold leading-4">Sumar</span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
