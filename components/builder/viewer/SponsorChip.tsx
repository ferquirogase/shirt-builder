// One marker on the shirt: a black dot with the placement's number, like GEPE's map. Once the
// placement has a sponsor the dot shows its image. It is drawn small but the button around it is
// 44px, the least a finger needs.
export function SponsorChip({
  number,
  label,
  image,
  selected,
  onSelect,
}: {
  number: number;
  label: string;
  /** The sponsor's image, once there is one. */
  image: string | undefined;
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
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-foreground text-sm font-bold text-white shadow-md transition-transform ${
          selected ? "scale-110 border-accent" : "border-white"
        }`}
      >
        {image ? (
          <span
            data-thumb
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-white bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${image}")` }}
          />
        ) : null}
        <span
          className={
            image
              ? "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] leading-none"
              : ""
          }
        >
          {number}
        </span>
      </span>
    </button>
  );
}
