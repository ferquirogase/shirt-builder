import { describe, it, expect } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { Header } from "@/components/builder/Header";

describe("Header", () => {
  it("shows the project name and disables the not-yet-built actions", () => {
    renderWithDesign(<Header />);
    expect(screen.getByRole("textbox", { name: "Nombre del diseño" })).toHaveValue("Mi diseño");
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revisar diseño" })).toBeDisabled();
    expect(screen.queryByText("Guardado")).toBeNull();
  });

  it("keeps 'Revisar diseño' visible on mobile as an icon, with its text only on wide screens", () => {
    renderWithDesign(<Header />);
    const button = screen.getByRole("button", { name: "Revisar diseño" });
    // Not hidden below md (it used to be `hidden md:inline-flex`), and the label
    // is screen-reader-only until md.
    expect(button.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    const label = screen.getByText("Revisar diseño");
    expect(label.className).toContain("sr-only");
    expect(label.className).toContain("md:not-sr-only");
  });

  it("renames the project on blur", () => {
    const { api } = renderWithDesign(<Header />);
    const input = screen.getByRole("textbox", { name: "Nombre del diseño" });
    fireEvent.change(input, { target: { value: "  Los del viernes " } });
    fireEvent.blur(input);
    expect(api.current!.state.projectName).toBe("Los del viernes");
    expect(input).toHaveValue("Los del viernes");
  });

  it("restores the previous name when cleared to blank", () => {
    const { api } = renderWithDesign(<Header />);
    const input = screen.getByRole("textbox", { name: "Nombre del diseño" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(input).toHaveValue("Mi diseño");
    expect(api.current!.state.projectName).toBe("Mi diseño");
    expect(api.current!.canUndo).toBe(false);
  });
});
