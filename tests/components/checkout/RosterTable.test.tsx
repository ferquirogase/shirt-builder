import { describe, it, expect } from "vitest";
import { useReducer } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { RosterTable } from "@/components/checkout/RosterTable";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, orderReducer, type Order } from "@/lib/checkout/order";
import type { PlayerErrors } from "@/lib/checkout/validation";

function Harness({
  initial,
  errors = {},
  withShorts = false,
  withKeeper = false,
}: {
  initial: Order;
  errors?: Record<string, PlayerErrors>;
  withShorts?: boolean;
  withKeeper?: boolean;
}) {
  const [order, dispatch] = useReducer(orderReducer, initial);
  return <RosterTable roster={order.roster} errors={errors} dispatch={dispatch} withShorts={withShorts} withKeeper={withKeeper} />;
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

  it("has no shorts size column for a shirt-only order", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    expect(screen.queryByLabelText("Talle del short del jugador 1")).toBeNull();
  });

  it("lets each player pick a shorts size apart from the shirt size", () => {
    render(<Harness initial={order(createPlayerLine("a"))} withShorts />);
    fireEvent.change(screen.getByLabelText("Talle del short del jugador 1"), { target: { value: "L" } });
    expect(screen.getByLabelText("Talle del short del jugador 1")).toHaveValue("L");
    expect(screen.getByLabelText("Talle del jugador 1")).toHaveValue("M");
  });

  it("adds and removes players, never leaving the roster empty", () => {
    render(<Harness initial={order(createPlayerLine("a", { name: "Leo", number: "10" }))} />);
    expect(screen.getByRole("button", { name: "Quitar jugador 1" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    expect(screen.getByLabelText("Nombre del jugador 2")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Quitar jugador 1" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Quitar jugador 1" }));
    expect(screen.getByLabelText("Nombre del jugador 1")).toHaveValue("");
    expect(screen.queryByLabelText("Nombre del jugador 2")).toBeNull();
  });

  it("only offers name, number, size and remove on each player", () => {
    render(<Harness initial={order(createPlayerLine("a"), createPlayerLine("b"))} />);
    // One shirt per line: no quantity steppers, no duplicate, no folded-away options.
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryByRole("button", { name: /Duplicar|Más camisetas|Menos camisetas|Más opciones/ })).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Quitar jugador/ })).toHaveLength(2);
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

describe("RosterTable keeper", () => {
  it("has no keeper column unless the keeper is in the design", () => {
    render(<Harness initial={order(createPlayerLine("a"))} />);
    expect(screen.queryByLabelText("Arquero: jugador 1")).toBeNull();
  });

  it("marks who plays in goal", () => {
    render(<Harness initial={order(createPlayerLine("a"), createPlayerLine("b"))} withKeeper />);
    expect(screen.getByText("Marcá quién es el arquero.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Arquero: jugador 2"));
    expect(screen.getByLabelText("Arquero: jugador 2")).toBeChecked();
    expect(screen.getByLabelText("Arquero: jugador 1")).not.toBeChecked();
    expect(screen.queryByText("Marcá quién es el arquero.")).toBeNull();
  });
});
