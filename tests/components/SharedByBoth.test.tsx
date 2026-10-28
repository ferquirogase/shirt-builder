import { describe, it, expect, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { CrestPanel } from "@/components/builder/panels/CrestPanel";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";

vi.mock("@/lib/builder/texture/image-loader", () => ({ loadImage: vi.fn() }));

describe("what both shirts share", () => {
  it.each([
    ["Escudo", <CrestPanel key="e" />],
    ["Sponsor", <SponsorPanel key="s" />],
  ])("%s says it applies to both shirts, once the keeper is in", (_name, panel) => {
    const { api } = renderWithDesign(panel);
    expect(screen.queryByText("Se aplica a las dos camisetas")).toBeNull();
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(screen.getByText("Se aplica a las dos camisetas")).toBeInTheDocument();
  });
});
