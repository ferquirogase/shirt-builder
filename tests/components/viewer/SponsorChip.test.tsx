import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SponsorChip } from "@/components/builder/viewer/SponsorChip";

const base = { number: 2, label: "Manga izquierda", image: undefined, selected: false, onSelect: () => {} };

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

  it("shows the sponsor's image once there is one, and keeps the number", () => {
    render(<SponsorChip {...base} image="data:image/png;base64,AAAA" />);
    const chip = screen.getByRole("button");
    expect(chip.querySelector("[data-thumb]")).not.toBeNull();
    expect(chip).toHaveTextContent("2");
  });

  it("has no image while the placement is empty", () => {
    render(<SponsorChip {...base} />);
    expect(screen.getByRole("button").querySelector("[data-thumb]")).toBeNull();
  });

  it("reports the tap", () => {
    const onSelect = vi.fn();
    render(<SponsorChip {...base} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is at least 44px to tap, whatever size it is drawn", () => {
    render(<SponsorChip {...base} />);
    expect(screen.getByRole("button").className).toMatch(/h-11/);
    expect(screen.getByRole("button").className).toMatch(/w-11/);
  });
});
