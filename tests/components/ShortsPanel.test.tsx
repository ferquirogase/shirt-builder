import { describe, it, expect } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { ShortsPanel } from "@/components/builder/panels/ShortsPanel";

describe("ShortsPanel", () => {
  it("invites to add the shorts, with what they add to each player's price", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    const add = screen.getByRole("button", { name: "Sumar short" });
    expect(add).toHaveAccessibleDescription(/20/);
    expect(add).toHaveAccessibleDescription(/por jugador/);
    expect(screen.queryByText("Color del short")).toBeNull();
    fireEvent.click(add);
    expect(api.current!.state.shorts.included).toBe(true);
  });

  it("asks which shirt color the shorts wear, primary by default", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByText("Color del short")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Color primario/ })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: /Color secundario/ }));
    expect(api.current!.state.shorts.colorSource).toBe("secondary");
    expect(screen.getByRole("radio", { name: /Color secundario/ })).toBeChecked();
  });

  it("shows each option with the shirt's current color, in CMYK, without the hexadecimal", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "secondary", value: "#123456" }));
    const radio = screen.getByRole("radio", { name: /Color secundario/ });
    expect(radio).toHaveTextContent("C 79 M 40 Y 0 K 66");
    expect(radio).not.toHaveTextContent("#");
    expect((radio.querySelector("[data-swatch]") as HTMLElement).style.backgroundColor).toBe("rgb(18, 52, 86)");
  });

  it("can be taken out again", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar short" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar short" }));
    expect(api.current!.state.shorts.included).toBe(false);
    expect(screen.getByRole("button", { name: "Sumar short" })).toBeInTheDocument();
  });
});
