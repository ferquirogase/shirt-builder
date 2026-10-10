import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ContactForm } from "@/components/checkout/ContactForm";
import { DesignPreview } from "@/components/checkout/DesignPreview";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine } from "@/lib/checkout/order";
import { orderTotals } from "@/lib/checkout/pricing";
import { emptyContact } from "@/lib/checkout/validation";

// 12 players = 12 shirts, enough for the 10% discount.
const roster = Array.from({ length: 12 }, (_, i) => createPlayerLine(`p${i}`, { name: `J${i}`, number: String(i) }));

describe("DesignPreview", () => {
  it("shows the front and back thumbnails, the project name and a link back to the builder", () => {
    render(
      <DesignPreview
        order={{
          design: { ...initialDesignState, projectName: "Los del viernes" },
          thumbnails: { front: "data:image/jpeg;base64,F", back: "data:image/jpeg;base64,B" },
          roster,
        }}
      />
    );
    expect(screen.getByAltText("Camiseta de frente")).toHaveAttribute("src", "data:image/jpeg;base64,F");
    expect(screen.getByAltText("Camiseta de espalda")).toHaveAttribute("src", "data:image/jpeg;base64,B");
    expect(screen.getByText("Los del viernes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar diseño" })).toHaveAttribute("href", "/");
  });

  it("shows a placeholder instead of the images when the capture failed", () => {
    render(<DesignPreview order={{ design: initialDesignState, thumbnails: null, roster }} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Sin vista previa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar diseño" })).toBeInTheDocument();
  });
});

describe("OrderSummary", () => {
  it("lists shirts, subtotal, the discount and the total", () => {
    render(<OrderSummary totals={orderTotals(roster)} paying={false} />);
    expect(screen.getByText("Camisetas").nextElementSibling).toHaveTextContent("12");
    expect(screen.getByText("Descuento (10%)")).toBeInTheDocument();
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("378");
  });

  it("shows the shorts row only for a full kit", () => {
    const { rerender } = render(<OrderSummary totals={orderTotals(roster)} paying={false} />);
    expect(screen.queryByText("Pantalones")).toBeNull();
    rerender(<OrderSummary totals={orderTotals(roster, true)} paying={false} />);
    expect(screen.getByText("Pantalones").nextElementSibling).toHaveTextContent("12");
  });

  it("hides the discount row when there is none", () => {
    render(<OrderSummary totals={orderTotals([createPlayerLine("a")])} paying={false} />);
    expect(screen.queryByText(/Descuento/)).toBeNull();
  });

  it("disables the pay button and says so while paying; shows a payment error", () => {
    const { rerender } = render(<OrderSummary totals={orderTotals(roster)} paying />);
    expect(screen.getByRole("button", { name: "Procesando pago…" })).toBeDisabled();
    rerender(<OrderSummary totals={orderTotals(roster)} paying={false} error="No pudimos procesar el pago." />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos procesar el pago.");
    expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled();
  });

  it("says it is paid with Ripple, and that the demo charges nothing, in the small print", () => {
    render(<OrderSummary totals={orderTotals(roster)} paying={false} />);
    expect(screen.getByText("Pagás con Ripple. Demo: no se realiza ningún cobro.")).toBeInTheDocument();
  });

  it("is a submit button tied to the checkout form", () => {
    render(<OrderSummary totals={orderTotals(roster)} paying={false} />);
    const button = screen.getByRole("button", { name: "Pagar" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("form", "checkout-form");
  });
});

describe("ContactForm", () => {
  it("reports edits by field and submits", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<ContactForm contact={emptyContact} errors={{}} onChange={onChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "leo@club.com" } });
    expect(onChange).toHaveBeenCalledWith("email", "leo@club.com");
    fireEvent.submit(document.getElementById("checkout-form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("marks fields with errors and describes them", () => {
    render(
      <ContactForm
        contact={emptyContact}
        errors={{ city: "Completá este campo" }}
        onChange={() => {}}
        onSubmit={() => {}}
      />
    );
    const city = screen.getByLabelText("Ciudad");
    expect(city).toHaveAttribute("aria-invalid", "true");
    expect(city).toHaveAccessibleDescription("Completá este campo");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });
});
