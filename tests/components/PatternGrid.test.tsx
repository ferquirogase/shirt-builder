import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PatternGrid } from "@/components/builder/PatternGrid";
import { clearPatternMarkupCache } from "@/lib/builder/pattern-thumbnail";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;
const patterns = [
  { id: "a", label: "Liso", svgPath: "/patterns/a.svg" },
  { id: "b", label: "Franjas", svgPath: "/patterns/b.svg" },
];

describe("PatternGrid", () => {
  beforeEach(() => clearPatternMarkupCache());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a radio per pattern, marks the selected one and reports clicks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
    const onSelect = vi.fn();
    const { container } = render(
      <PatternGrid patterns={patterns} selectedId="b" primary="#111111" secondary="#eeeeee" onSelect={onSelect} />
    );

    expect(screen.getByRole("radio", { name: "Franjas" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Liso" })).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("radio", { name: "Liso" }));
    expect(onSelect).toHaveBeenCalledWith("a");

    await waitFor(() => expect(container.querySelectorAll('[data-thumb="loaded"]')).toHaveLength(2));
  });

  it("shows a fallback (and does not crash) when a pattern fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, text: async () => "" })));
    const { container } = render(
      <PatternGrid patterns={patterns} selectedId="a" primary="#111111" secondary="#eeeeee" onSelect={() => {}} />
    );
    await waitFor(() => expect(container.querySelectorAll('[data-thumb="error"]')).toHaveLength(2));
    expect(screen.getByRole("radio", { name: "Liso" })).toBeInTheDocument();
  });
});
