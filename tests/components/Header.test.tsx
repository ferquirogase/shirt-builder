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
