import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SponsorChip } from "@/components/builder/viewer/SponsorChip";

const base = { number: 2, label: "Manga izquierda", filled: false, selected: false, onSelect: () => {} };

// The visible dot inside the button.
const dot = () => screen.getByRole("button").querySelector("[data-dot]") as HTMLElement;

describe("SponsorChip", () => {
  it("is a button named after its number and its placement, showing the number", () => {
    render(<SponsorChip {...base} />);
    const chip = screen.getByRole("button", { name: "Sponsor 2: Manga izquierda" });
    expect(chip).toHaveTextContent("2");
  });

  it("tells whether it is the selected one", () => {
    const { rerender } = render(<SponsorChip {...base} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(<SponsorChip {...base} selected />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("is a full-size dot while the placement is empty", () => {
    render(<SponsorChip {...base} />);
    expect(dot().className).toMatch(/h-8/);
    expect(dot().className).toMatch(/w-8/);
  });

  it("shrinks to a small badge once the placement has a sponsor, so it does not hide it", () => {
    render(<SponsorChip {...base} filled />);
    expect(dot().className).toMatch(/h-5/);
    expect(dot().className).toMatch(/w-5/);
    expect(dot().className).not.toMatch(/h-8/);
    expect(screen.getByRole("button")).toHaveTextContent("2");
  });

  it("moves the badge to a corner, off the sponsor's center", () => {
    const { rerender } = render(<SponsorChip {...base} />);
    expect(dot().className).not.toMatch(/translate/);
    rerender(<SponsorChip {...base} filled />);
    expect(dot().className).toMatch(/translate/);
  });

  it("does not show the sponsor's image itself: the panel already does, and the shirt shows it printed", () => {
    render(<SponsorChip {...base} filled />);
    expect(screen.getByRole("button").querySelector("[data-thumb]")).toBeNull();
    expect(screen.getByRole("button").querySelector("[style*='background-image']")).toBeNull();
  });

  it("reports the tap", () => {
    const onSelect = vi.fn();
    render(<SponsorChip {...base} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is at least 44px to tap, empty or filled", () => {
    const { rerender } = render(<SponsorChip {...base} />);
    for (const filled of [false, true]) {
      rerender(<SponsorChip {...base} filled={filled} />);
      expect(screen.getByRole("button").className).toMatch(/h-11/);
      expect(screen.getByRole("button").className).toMatch(/w-11/);
    }
  });

  it("still shows when it is selected, filled or not", () => {
    render(<SponsorChip {...base} filled selected />);
    expect(dot().className).toMatch(/border-accent/);
  });
});
