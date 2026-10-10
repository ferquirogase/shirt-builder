import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const payWithRipple = vi.fn();
vi.mock("@/lib/checkout/payment", () => ({
  payWithRipple: (...args: unknown[]) => payWithRipple(...args),
}));

import { CheckoutPage } from "@/components/checkout/CheckoutPage";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, type Confirmation, type Order } from "@/lib/checkout/order";
import { clearConfirmation, clearOrder, loadConfirmation, loadOrder, saveOrder } from "@/lib/checkout/order-storage";

function makeOrder(...roster: ReturnType<typeof createPlayerLine>[]): Order {
  return {
    design: { ...initialDesignState, projectName: "Los del viernes" },
    thumbnails: { front: "data:image/jpeg;base64,F", back: "data:image/jpeg;base64,B" },
    roster: roster.length ? roster : [createPlayerLine("a", { name: "Leo", number: "10" })],
  };
}

function fillContact() {
  const values: Record<string, string> = {
    "Nombre y apellido": "Leo Messi",
    Email: "leo@club.com",
    Teléfono: "1155550000",
    "Dirección de envío": "Av. Siempre Viva 742",
    Ciudad: "Rosario",
    "Código postal": "2000",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

const confirmation: Confirmation = {
  number: "GEPE-ABC234",
  email: "leo@club.com",
  projectName: "Los del viernes",
  shirts: 1,
  total: 35,
  roster: [createPlayerLine("a", { name: "Leo", number: "10" })],
};

beforeEach(() => {
  clearOrder();
  clearConfirmation();
  push.mockReset();
  payWithRipple.mockReset();
});

describe("CheckoutPage", () => {
  it("tells the user there is no order and offers to go back to the builder", () => {
    render(<CheckoutPage />);
    expect(screen.getByText("No hay ningún pedido en curso.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a diseñar" })).toHaveAttribute("href", "/");
  });

  it("opens the saved order", () => {
    saveOrder(makeOrder());
    render(<CheckoutPage />);
    expect(screen.getByText("Los del viernes")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre del jugador 1")).toHaveValue("Leo");
  });
});

describe("CheckoutView", () => {
  it("updates the summary as players are added and quantities change, and saves the order", () => {
    render(<CheckoutView initial={makeOrder()} />);
    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    fireEvent.click(screen.getByRole("button", { name: "Más camisetas del jugador 2" }));

    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("3");
    expect(loadOrder()!.roster).toHaveLength(2);
    expect(loadOrder()!.roster[1].quantity).toBe(2);
  });

  it("does not show errors until the user tries to pay, then shows them and focuses the first one", async () => {
    render(<CheckoutView initial={makeOrder(createPlayerLine("a"))} />);
    expect(screen.queryByText("Ingresá un nombre")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));

    expect(screen.getByText("Ingresá un nombre")).toBeInTheDocument();
    expect(screen.getByText("Ingresá un número")).toBeInTheDocument();
    expect(screen.getAllByText("Completá este campo").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByLabelText("Nombre del jugador 1")).toHaveFocus());
    expect(payWithRipple).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks the payment for a repeated number", () => {
    render(
      <CheckoutView
        initial={makeOrder(createPlayerLine("a", { name: "Leo", number: "7" }), createPlayerLine("b", { name: "Dibu", number: "07" }))}
      />
    );
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));
    expect(screen.getAllByText("Número repetido")).toHaveLength(2);
    expect(payWithRipple).not.toHaveBeenCalled();
  });

  it("pays a valid order: keeps a confirmation, clears the order and goes to the confirmation page", async () => {
    payWithRipple.mockResolvedValue(confirmation);
    const order = makeOrder();
    render(<CheckoutView initial={order} />);
    fillContact();

    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/confirmacion"));
    expect(payWithRipple).toHaveBeenCalledTimes(1);
    expect(payWithRipple.mock.calls[0][0]).toMatchObject({ roster: order.roster });
    expect(payWithRipple.mock.calls[0][1]).toMatchObject({ email: "leo@club.com" });
    expect(loadConfirmation()).toEqual(confirmation);
    expect(loadOrder()).toBeNull();
  });

  it("shows an error and keeps the order when the payment fails, and lets the user retry", async () => {
    payWithRipple.mockRejectedValueOnce(new Error("network"));
    render(<CheckoutView initial={makeOrder()} />);
    fillContact();

    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos procesar el pago");
    expect(push).not.toHaveBeenCalled();
    expect(loadOrder()).not.toBeNull();
    expect(loadConfirmation()).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Ripple" })).toBeEnabled();

    payWithRipple.mockResolvedValueOnce(confirmation);
    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/confirmacion"));
  });

  it("locks the roster and contact fields while the payment is in progress", async () => {
    let finish!: (c: Confirmation) => void;
    payWithRipple.mockReturnValue(new Promise<Confirmation>((resolve) => (finish = resolve)));
    render(<CheckoutView initial={makeOrder()} />);
    fillContact();

    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));

    // Disabled for the user...
    await waitFor(() => expect(screen.getByRole("button", { name: "Agregar jugador" })).toBeDisabled());
    expect(screen.getByLabelText("Nombre del jugador 1")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    // ...and ignored even if an edit sneaks through: what is charged is what was validated.
    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    fireEvent.change(screen.getByLabelText("Nombre del jugador 1"), { target: { value: "Otro" } });
    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByLabelText("Nombre del jugador 1")).toHaveValue("Leo");
    expect(loadOrder()!.roster).toHaveLength(1);
    expect(loadOrder()!.roster[0].name).toBe("Leo");

    finish(confirmation);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/confirmacion"));
  });

  it("does not save a paid order again if the form is touched before the navigation finishes", async () => {
    payWithRipple.mockResolvedValue(confirmation);
    render(<CheckoutView initial={makeOrder()} />);
    fillContact();

    fireEvent.click(screen.getByRole("button", { name: "Pagar con Ripple" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/confirmacion"));
    expect(loadOrder()).toBeNull();

    fireEvent.change(screen.getByLabelText("Nombre del jugador 1"), { target: { value: "Otro" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    expect(loadOrder()).toBeNull();
  });

  it("shows the total in the bar fixed to the bottom on mobile", () => {
    render(<CheckoutView initial={makeOrder(createPlayerLine("a", { name: "Leo", number: "10", quantity: 3 }))} />);
    const bar = screen.getByTestId("mobile-total-bar");
    expect(bar).toHaveTextContent("3 camisetas");
    expect(bar.className).toContain("md:hidden");
  });
});
