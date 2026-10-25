// One marker on the shirt: a black dot with the placement's number, like GEPE's map. Once the
// placement has a sponsor the dot shrinks to a small badge in a corner, so it does not cover the
// sponsor that is now printed there (the panel shows the image itself). It is drawn small but the
// button around it is 44px, the least a finger needs.
export function SponsorChip({
  number,
  label,
  filled,
  selected,
  onSelect,
}: {
  number: number;
  label: string;
  /** The placement already has a sponsor. */
  filled: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Sponsor ${number}: ${label}`}
      aria-pressed={selected}
      onClick={onSelect}
      className="flex h-11 w-11 items-center justify-center rounded-full"
    >
      <span
        data-dot
        className={`flex items-center justify-center rounded-full border-2 bg-foreground font-bold text-white shadow-md transition-transform ${
          filled ? "h-5 w-5 translate-x-4 -translate-y-4 text-[10px] leading-none" : "h-8 w-8 text-sm"
        } ${selected ? "scale-110 border-accent" : "border-white"}`}
      >
        {number}
      </span>
    </button>
  );
}
