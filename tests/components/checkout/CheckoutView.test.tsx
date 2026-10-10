import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// The summary has the real "Pagar"; the mobile bar has another one with the same name.
function payButton() {
  return within(screen.getByRole("region", { name: "Resumen del pedido" })).getByRole("button", { name: "Pagar" });
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
  shorts: 0,
  total: 35,
  roster: [createPlayerLine("a", { name: "Leo", number: "10" })],
};

beforeEach(() => {
  clearOrder();
  clearConfirmation();
  push.mockReset();
  payWithRipple.mockReset();
});

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let observerCallback: ObserverCallback | null = null;
let observerOptions: IntersectionObserverInit | undefined;
let observed: Element[] = [];

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    observerCallback = callback;
    observerOptions = options;
  }
  observe(element: Element) {
    observed.push(element);
  }
  unobserve() {}
  disconnect() {}
}

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
  it("asks for a shorts size per player only when the order is a full kit", () => {
    const kit = makeOrder();
    const { unmount } = render(
      <CheckoutView initial={{ ...kit, design: { ...kit.design, shorts: { included: true, colorSource: "primary" } } }} />
    );
    expect(screen.getByLabelText("Talle del short del jugador 1")).toBeInTheDocument();
    unmount();
    render(<CheckoutView initial={makeOrder()} />);
    expect(screen.queryByLabelText("Talle del short del jugador 1")).toBeNull();
  });

  it("charges the shorts in the total of a full kit", () => {
    const kit = makeOrder();
    render(
      <CheckoutView initial={{ ...kit, design: { ...kit.design, shorts: { included: true, colorSource: "primary" } } }} />
    );
    const summary = within(screen.getByRole("region", { name: "Resumen del pedido" }));
    expect(summary.getByText("Shorts").nextElementSibling).toHaveTextContent("1");
    expect(summary.getByText("Total").nextElementSibling).toHaveTextContent("55");
  });

  it("updates the summary as players are added and removed, and saves the order", () => {
    render(<CheckoutView initial={makeOrder()} />);
    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("2");
    expect(loadOrder()!.roster).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Quitar jugador 2" }));
    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("1");
    expect(loadOrder()!.roster).toHaveLength(1);
  });

  it("does not show errors until the user tries to pay, then shows them and focuses the first one", async () => {
    render(<CheckoutView initial={makeOrder(createPlayerLine("a"))} />);
    expect(screen.queryByText("Ingresá un nombre")).toBeNull();

    fireEvent.click(payButton());

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
    fireEvent.click(payButton());
    expect(screen.getAllByText("Número repetido")).toHaveLength(2);
    expect(payWithRipple).not.toHaveBeenCalled();
  });

  it("pays a valid order: keeps a confirmation, clears the order and goes to the confirmation page", async () => {
    payWithRipple.mockResolvedValue(confirmation);
    const order = makeOrder();
    render(<CheckoutView initial={order} />);
    fillContact();

    fireEvent.click(payButton());

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

    fireEvent.click(payButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos procesar el pago");
    expect(push).not.toHaveBeenCalled();
    expect(loadOrder()).not.toBeNull();
    expect(loadConfirmation()).toBeNull();
    expect(payButton()).toBeEnabled();

    payWithRipple.mockResolvedValueOnce(confirmation);
    fireEvent.click(payButton());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/confirmacion"));
  });

  it("locks the roster and contact fields while the payment is in progress", async () => {
    let finish!: (c: Confirmation) => void;
    payWithRipple.mockReturnValue(new Promise<Confirmation>((resolve) => (finish = resolve)));
    render(<CheckoutView initial={makeOrder()} />);
    fillContact();

    fireEvent.click(payButton());

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

    fireEvent.click(payButton());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/confirmacion"));
    expect(loadOrder()).toBeNull();

    fireEvent.change(screen.getByLabelText("Nombre del jugador 1"), { target: { value: "Otro" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar jugador" }));
    expect(loadOrder()).toBeNull();
  });

  it("shows the total in the bar fixed to the bottom on mobile", () => {
    render(
      <CheckoutView
        initial={makeOrder(
          createPlayerLine("a", { name: "Leo", number: "10" }),
          createPlayerLine("b", { name: "Dibu", number: "1" }),
          createPlayerLine("c", { name: "Otro", number: "9" })
        )}
      />
    );
    const bar = screen.getByTestId("mobile-total-bar");
    expect(bar).toHaveTextContent("3 camisetas");
    expect(bar.className).toContain("md:hidden");
  });

  describe("mobile total bar", () => {
    beforeEach(() => {
      observerCallback = null;
      observerOptions = undefined;
      observed = [];
      vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    });
    afterEach(() => vi.unstubAllGlobals());

    it("goes away while the summary Pagar button is on screen, so there is one pay action, and comes back", () => {
      render(<CheckoutView initial={makeOrder()} />);
      expect(screen.getByTestId("mobile-total-bar")).toBeInTheDocument();

      act(() => observerCallback!([{ isIntersecting: true }]));
      expect(screen.queryByTestId("mobile-total-bar")).toBeNull();
      expect(screen.getAllByRole("button", { name: "Pagar" })).toHaveLength(1);

      act(() => observerCallback!([{ isIntersecting: false }]));
      expect(screen.getByTestId("mobile-total-bar")).toBeInTheDocument();
    });

    it("watches the summary button itself and counts the bar as covering the bottom of the screen", () => {
      render(<CheckoutView initial={makeOrder()} />);
      expect(observed).toEqual([payButton()]);
      expect(observerOptions?.rootMargin).toMatch(/^0px 0px -[1-9]\d*px 0px$/);
    });
  });
});

describe("CheckoutView keeper", () => {
  const withKeeper = (order: Order): Order => ({
    ...order,
    design: { ...order.design, keeper: { ...order.design.keeper, included: true } },
  });

  it("shows the keeper's photos next to the player's", () => {
    const order = withKeeper({ ...makeOrder(), keeperThumbnails: { front: "data:image/jpeg;base64,KF", back: "data:image/jpeg;base64,KB" } });
    render(<CheckoutView initial={order} />);
    expect(screen.getByAltText("Camiseta del arquero de frente")).toBeInTheDocument();
    expect(screen.getByAltText("Camiseta del arquero de espalda")).toBeInTheDocument();
  });

  it("shows no keeper photos without a keeper, even from an old order", () => {
    const stale: Order = { ...makeOrder(), keeperThumbnails: { front: "data:image/jpeg;base64,KF", back: "data:image/jpeg;base64,KB" } };
    render(<CheckoutView initial={stale} />);
    expect(screen.queryByAltText("Camiseta del arquero de frente")).toBeNull();
  });

  it("labels the two pairs of photos only when there is a keeper", () => {
    const { unmount } = render(<CheckoutView initial={makeOrder()} />);
    expect(screen.queryByRole("heading", { name: "Jugador" })).toBeNull();
    unmount();

    const order = withKeeper({ ...makeOrder(), keeperThumbnails: { front: "data:image/jpeg;base64,KF", back: "data:image/jpeg;base64,KB" } });
    render(<CheckoutView initial={order} />);
    const photos = screen.getByRole("region", { name: "Tu diseño" });
    expect(within(photos).getByRole("heading", { name: "Jugador" })).toBeInTheDocument();
    expect(within(photos).getByRole("heading", { name: "Arquero" })).toBeInTheDocument();
  });

  it("asks who plays in goal in the roster", () => {
    render(<CheckoutView initial={withKeeper(makeOrder())} />);
    expect(screen.getByLabelText("Arquero: jugador 1")).toBeInTheDocument();
  });
});
