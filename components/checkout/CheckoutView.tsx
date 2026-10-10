"use client";
import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { orderReducer, type Order, type OrderAction } from "@/lib/checkout/order";
import { clearOrder, saveConfirmation, saveOrder } from "@/lib/checkout/order-storage";
import { payWithRipple } from "@/lib/checkout/payment";
import { formatMoney, orderTotals } from "@/lib/checkout/pricing";
import { emptyContact, hasErrors, noErrors, validateOrder, type ContactInfo } from "@/lib/checkout/validation";
import { CheckoutShell } from "./CheckoutShell";
import { CHECKOUT_FORM_ID, ContactForm } from "./ContactForm";
import { DesignPreview } from "./DesignPreview";
import { OrderSummary } from "./OrderSummary";
import { RosterTable } from "./RosterTable";
import { CARD } from "./styles";

const PAYMENT_ERROR = "No pudimos procesar el pago. Probá de nuevo.";

export function CheckoutView({ initial }: { initial: Order }) {
  const router = useRouter();
  const [order, rawDispatch] = useReducer(orderReducer, initial);
  const [contact, setContact] = useState<ContactInfo>(emptyContact);
  // Once the payment starts the order is what was validated: edits are ignored
  // (the fields are also disabled) and a paid order is never saved again.
  const locked = useRef(false);
  const dispatch = useCallback((action: OrderAction) => {
    if (!locked.current) rawDispatch(action);
  }, []);
  // Errors are computed live but only shown after the first attempt to pay.
  const [attempted, setAttempted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | undefined>();

  useEffect(() => {
    if (!locked.current) saveOrder(order);
  }, [order]);

  const totals = orderTotals(order.roster);
  const errors = validateOrder(order.roster, contact);
  const shown = attempted ? errors : noErrors;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paying) return;
    setAttempted(true);

    if (hasErrors(errors)) {
      // Wait for the errors to render, then move to the first invalid field.
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    locked.current = true;
    setPaying(true);
    setPayError(undefined);
    try {
      const confirmation = await payWithRipple(order, contact);
      saveConfirmation(confirmation);
      clearOrder();
      router.push("/checkout/confirmacion");
    } catch {
      locked.current = false;
      setPayError(PAYMENT_ERROR);
      setPaying(false);
    }
  }

  return (
    <CheckoutShell title="Tu pedido">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_24rem] md:items-start">
        <div className="space-y-6">
          <DesignPreview order={order} />
          <section aria-labelledby="roster-title" className={CARD}>
            <h2 id="roster-title" className="mb-1 text-lg font-bold">
              Plantel
            </h2>
            <p className="mb-4 text-sm text-muted">Cada fila es una camiseta con este diseño. Agregá un jugador por cada integrante.</p>
            <fieldset disabled={paying} className="min-w-0 border-0 p-0">
              <RosterTable roster={order.roster} errors={shown.players} dispatch={dispatch} />
            </fieldset>
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="contact-title" className={CARD}>
            <h2 id="contact-title" className="mb-4 text-lg font-bold">
              Contacto y envío
            </h2>
            <fieldset disabled={paying} className="min-w-0 border-0 p-0">
              <ContactForm
                contact={contact}
                errors={shown.contact}
                onChange={(field, value) => {
                  if (!locked.current) setContact((current) => ({ ...current, [field]: value }));
                }}
                onSubmit={handleSubmit}
              />
            </fieldset>
          </section>
          <OrderSummary totals={totals} paying={paying} error={payError} />
        </div>
      </div>

      <div
        data-testid="mobile-total-bar"
        className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 md:hidden"
      >
        <div>
          <p className="text-xs text-muted">{totals.shirts} camisetas</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(totals.total)}</p>
        </div>
        <button
          type="submit"
          form={CHECKOUT_FORM_ID}
          disabled={paying}
          className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          Pagar
        </button>
      </div>
    </CheckoutShell>
  );
}
