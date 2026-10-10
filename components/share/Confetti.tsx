import type { CSSProperties } from "react";

const COLORS = ["#f5b400", "#ffffff", "#fdf1cc", "#c98f00", "#0a5c36"];

// Fixed values (no randomness while rendering) so the burst is the same on
// every render and in every test.
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 40) / 100,
  duration: 1.6 + ((i * 29) % 12) / 10,
  drift: ((i * 17) % 41) - 20,
  spin: (i * 47) % 360,
  color: COLORS[i % COLORS.length],
}));

export function Confetti() {
  return (
    <div data-testid="confetti" aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {PIECES.map((piece, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              backgroundColor: piece.color,
              "--drift": `${piece.drift}vw`,
              "--spin": `${piece.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
