import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplashScreen } from "@/components/builder/SplashScreen";

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

  it("reveals the shirt with a CSS clip on a wrapper, not by animating inside an SVG clipPath", () => {
    // Chrome does not repaint an animation inside a clipPath: the reveal got stuck halfway,
    // leaving a horizontal cut in the shirt until something else forced a repaint.
    const { container } = render(<SplashScreen phase="showing" />);
    expect(container.querySelector(".splash-reveal svg")).not.toBeNull();
    expect(container.querySelector("clipPath [class]")).toBeNull();
  });

  it("renders nothing once gone", () => {
    render(<SplashScreen phase="gone" />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
