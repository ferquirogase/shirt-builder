import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplashScreen } from "@/components/builder/SplashScreen";
import { SPLASH_PHRASES } from "@/lib/builder/splash";

describe("SplashScreen", () => {
  it("announces that the builder is loading", () => {
    render(<SplashScreen phase="showing" />);
    expect(screen.getByRole("status", { name: "Cargando GEPE" })).toBeInTheDocument();
  });

  it("fades out while leaving, without blocking clicks", () => {
    render(<SplashScreen phase="leaving" />);
    const splash = screen.getByRole("status", { name: "Cargando GEPE" });
    expect(splash.className).toContain("opacity-0");
    expect(splash.className).toContain("pointer-events-none");
  });

  it("is fully visible while showing", () => {
    render(<SplashScreen phase="showing" />);
    expect(screen.getByRole("status", { name: "Cargando GEPE" }).className).not.toContain("opacity-0");
  });

  it("shows the match phrases, one after the other, under the GEPE name", () => {
    const { container } = render(<SplashScreen phase="showing" />);
    const shown = Array.from(container.querySelectorAll(".splash-phrase")).map((el) => el.textContent);
    expect(shown).toEqual([...SPLASH_PHRASES]);
  });

  it("has four short phrases: the fade keyframes in globals.css give each a quarter of the round", () => {
    expect(SPLASH_PHRASES).toHaveLength(4);
    for (const phrase of SPLASH_PHRASES) expect(phrase.length).toBeLessThanOrEqual(30);
  });

  it("no longer shows the shirt that tries on designs", () => {
    const { container } = render(<SplashScreen phase="showing" />);
    expect(container.querySelector("svg, .splash-reveal, .splash-shirt, .splash-body")).toBeNull();
  });

  it("renders nothing once gone", () => {
    render(<SplashScreen phase="gone" />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
