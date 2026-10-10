import { describe, it, expect } from "vitest";
import { useReducer } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RosterTable } from "@/components/checkout/RosterTable";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, orderReducer, type Order } from "@/lib/checkout/order";
import type { PlayerErrors } from "@/lib/checkout/validation";

function Harness({ initial, errors = {} }: { initial: Order; errors?: Record<string, PlayerErrors> }) {
  const [order, dispatch] = useReducer(orderReducer, initial);
  return <RosterTable roster={order.roster} errors={errors} dispatch={dispatch} />;
}

function order(...lines: ReturnType<typeof createPlayerLine>[]): Order {
  return { design: initialDesignState, thumbnails: null, roster: lines };
}

describe("RosterTable", () => {
  it("edits name and number, keeping the number to two digits", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    fireEvent.change(screen.getByLabelText("Nombre del jugador 1"), { target: { value: "Messi" } });
    fireEvent.change(screen.getByLabelText("Número del jugador 1"), { target: { value: "1a0b9" } });
    expect(screen.getByLabelText("Nombre del jugador 1")).toHaveValue("Messi");
    expect(screen.getByLabelText("Número del jugador 1")).toHaveValue("10");
  });

  it("changes the size", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    fireEvent.change(screen.getByLabelText("Talle del jugador 1"), { target: { value: "XL" } });
    expect(screen.getByLabelText("Talle del jugador 1")).toHaveValue("XL");
  });

  it("steps the quantity between 1 and 99", () => {
    render(<Harness initial={order(createPlayerLine("a", { quantity: 1 }), createPlayerLine("b", { quantity: 99 }))} />);
    const group1 = screen.getByRole("group", { name: "Cantidad del jugador 1" });
    const group2 = screen.getByRole("group", { name: "Cantidad del jugador 2" });

    expect(screen.getByRole("button", { name: "Menos camisetas del jugador 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Más camisetas del jugador 2" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Más camisetas del jugador 1" }));
    expect(within(group1).getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Menos camisetas del jugador 2" }));
    expect(within(group2).getByText("98")).toBeInTheDocument();
  });

  it("adds, duplicates and removes players, never leaving the roster empty", () => {
    render(<Harness initial={order(createPlayerLine("a", { name: "Leo", number: "10" }))} />);
    expect(screen.getByRole("button", { name: "Quitar jugador 1" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    expect(screen.getByLabelText("Nombre del jugador 2")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Duplicar jugador 1" }));
    expect(screen.getByLabelText("Nombre del jugador 2")).toHaveValue("Leo");
    expect(screen.getByLabelText("Nombre del jugador 3")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Quitar jugador 2" }));
    expect(screen.getByLabelText("Nombre del jugador 1")).toHaveValue("Leo");
    expect(screen.getByLabelText("Nombre del jugador 2")).toHaveValue("");
    expect(screen.queryByLabelText("Nombre del jugador 3")).toBeNull();
  });

  it("marks invalid fields and shows their messages", () => {
    render(
      <Harness
        initial={order(createPlayerLine("a"))}
        errors={{ a: { name: "Ingresá un nombre", number: "Ingresá un número" } }}
      />
    );
    const name = screen.getByLabelText("Nombre del jugador 1");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Ingresá un nombre");
    expect(screen.getByLabelText("Número del jugador 1")).toHaveAccessibleDescription("Ingresá un número");
  });
});

describe("RosterTable on mobile (one compact line per player)", () => {
  it("starts with quantity and duplicate folded away and opens them with the ⋯ button", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    const toggle = screen.getByRole("button", { name: "Más opciones del jugador 1" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(panel.className).toContain("max-md:hidden");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel.className).not.toContain("max-md:hidden");

    fireEvent.click(toggle);
    expect(panel.className).toContain("max-md:hidden");
  });

  it("keeps quantity and duplicate inside the panel and remove in the line itself", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    const toggle = screen.getByRole("button", { name: "Más opciones del jugador 1" });
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(panel).toContainElement(screen.getByRole("group", { name: "Cantidad del jugador 1" }));
    expect(panel).toContainElement(screen.getByRole("button", { name: "Duplicar jugador 1" }));
    expect(panel).not.toContainElement(screen.getByRole("button", { name: "Quitar jugador 1" }));
  });

  it("shows the quantity on the toggle when it is more than one, and ⋯ otherwise", () => {
    render(<Harness initial={order(createPlayerLine("a", { quantity: 1 }), createPlayerLine("b", { quantity: 3 }))} />);
    expect(screen.getByRole("button", { name: "Más opciones del jugador 1" })).toHaveTextContent("⋯");
    expect(screen.getByRole("button", { name: "Más opciones del jugador 2" })).toHaveTextContent("×3");
  });

  it("opens one player's options without opening the others", () => {
    render(<Harness initial={order(createPlayerLine("a"), createPlayerLine("b"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Más opciones del jugador 2" }));
    expect(screen.getByRole("button", { name: "Más opciones del jugador 1" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Más opciones del jugador 2" })).toHaveAttribute("aria-expanded", "true");
  });

  it("hides the toggle from md up, where quantity and duplicate are always columns", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    const toggle = screen.getByRole("button", { name: "Más opciones del jugador 1" });
    expect(toggle.className).toContain("md:hidden");
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(panel.className).toContain("md:contents");
  });

  it("shows both error messages in one full-width block under the line", () => {
    render(
      <Harness
        initial={order(createPlayerLine("a"))}
        errors={{ a: { name: "Ingresá un nombre", number: "Ingresá un número" } }}
      />
    );
    const block = screen.getByText("Ingresá un nombre").parentElement!;
    expect(block.className).toContain("col-span-full");
    expect(block).toContainElement(screen.getByText("Ingresá un número"));
  });
});
