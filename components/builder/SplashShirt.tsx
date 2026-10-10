// The shirt of the splash screen, from the brand's own vector. The pieces that change color
// (body and sleeves, trim) carry a class so globals.css can animate them; the rest is fixed.
const BODY =
  "M330.7,26.7C297.9,14.5,280.4,0,274.3,0c0,0,6.7,40.7-47.6,40.7S179,0,179,0c-6.1,0-23.6,14.5-56.4,26.7-32.8,12.2-54.1,19.8-62.5,32,11.4,9.1,48,29.7,48,123.4v278.1s51,15.2,118.1,15.2,118.9-15.2,118.9-15.2V182.1c0-93.7,36.6-114.3,48-123.4-8.4-12.2-29.7-19.8-62.5-32Z";
const SLEEVE_LEFT =
  "M60.2,58.7S18.3,133.4,0,189.7c4.6,13.7,46.5,41.9,87.6,38.9,13.7-37.3,25.1-53.3,25.1-53.3,0,0,3-97.5-52.6-116.6Z";
const SLEEVE_RIGHT =
  "M393.2,58.7s41.9,74.7,60.2,131c-4.6,13.7-46.5,41.9-87.6,38.9-13.7-37.3-25.1-53.3-25.1-53.3,0,0-3-97.5,52.6-116.6Z";
const COLLAR =
  "M226.7,46.9c52.9,0,59.9-36.8,59.9-41.4-5.9-3.3-10-5.5-12.3-5.5,0,0,6,33.3-47.6,33.3S179,0,179,0c-2.3,0-6.4,2.2-12.3,5.5,0,0,7.6,41.4,60,41.4Z";
const CUFF_LEFT =
  "M6,172.9c-1.5,3.9-2.8,7.7-4.1,11.5,6.3,14.2,47.2,41.1,87.8,38.7,1.7-4.4,3.3-8.5,4.9-12.3-40.1,2.6-80.6-23.2-88.7-37.9Z";
const CUFF_RIGHT =
  "M447.6,172.9c1.5,3.9,2.8,7.7,4.1,11.5-6.3,14.2-47.2,41.1-87.8,38.7-1.7-4.4-3.3-8.5-4.9-12.3,40.1,2.6,80.7-23.2,88.7-37.9Z";
const SHADE_RIGHT =
  "M394.9,226c-19.8-54-37.2-84.9-44.7-97.2,2-9.4,4.5-17.6,7.2-24.6-29.8,22.7-59.7,59.2-61.8,120.4-2.6,76.2-6.6,190.9-8.5,247,36.1-4.5,58.1-11.5,58.1-11.5V182.7c4.6,8.1,12.1,22.9,20.6,45.9,9.9.7,19.7-.4,29.1-2.6Z";
const SHADE_LEFT =
  "M96,104.2c2.8,7,5.2,15.1,7.2,24.4-7.5,12.1-24.9,43-44.8,97.4,9.5,2.2,19.4,3.3,29.3,2.6,8.4-23,16-37.8,20.6-45.9v277.5s22.9,6.8,58.1,11.3c-1.9-56.2-5.9-170.7-8.5-246.9-2.1-61.3-31.9-97.7-61.8-120.5Z";

// Vertical bands and horizontal hoops, to show the shirt in more than one design.
const BANDS = Array.from({ length: 5 }, (_, i) => 60 + i * 78);
const HOOPS = Array.from({ length: 6 }, (_, i) => 70 + i * 70);

export function SplashShirt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 453.3 475.4" className={className}>
      <defs>
        {/* The whole shirt is uncovered from the bottom up. */}
        <clipPath id="splash-wipe">
          <rect className="splash-wipe" x={-10} y={-10} width={474} height={496} />
        </clipPath>
        {/* Patterns only paint inside the garment. */}
        <clipPath id="splash-garment">
          <path d={BODY} />
          <path d={SLEEVE_LEFT} />
          <path d={SLEEVE_RIGHT} />
        </clipPath>
      </defs>

      <g clipPath="url(#splash-wipe)">
        {/* Inside of the neck. */}
        <rect x={178.9} y={4} width={96.3} height={89.5} fill="#000" fillOpacity={0.35} />
        <rect x={178.7} width={96.1} height={14.6} fill="#000" fillOpacity={0.4} />

        <path className="splash-body" d={SLEEVE_LEFT} />
        <path className="splash-body" d={SLEEVE_RIGHT} />
        <path className="splash-body" d={BODY} />

        <g clipPath="url(#splash-garment)">
          <g className="splash-bands" fill="#ffffff">
            {BANDS.map((x) => (
              <rect key={x} x={x} y={0} width={36} height={475.4} />
            ))}
          </g>
          <g className="splash-hoops" fill="#1c1917">
            {HOOPS.map((y) => (
              <rect key={y} x={0} y={y} width={453.3} height={28} />
            ))}
          </g>
        </g>

        <g opacity={0.1}>
          <path d={SHADE_RIGHT} />
          <path d={SHADE_LEFT} />
        </g>

        <path className="splash-trim" d={COLLAR} />
        <path className="splash-trim" d={CUFF_LEFT} />
        <path className="splash-trim" d={CUFF_RIGHT} />
      </g>
    </svg>
  );
}
