import { formatMoney, type Totals } from "@/lib/checkout/pricing";
import { CHECKOUT_FORM_ID } from "./ContactForm";
import { CARD } from "./styles";

type Props = { totals: Totals; paying: boolean; error?: string };

export function OrderSummary({ totals, paying, error }: Props) {
  return (
    <section aria-label="Resumen del pedido" className={CARD}>
      <h2 className="mb-3 text-lg font-bold">Resumen</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Camisetas</dt>
          <dd className="tabular-nums">{totals.shirts}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
        </div>
        {totals.discountRate > 0 && (
          <div className="flex justify-between text-accent-strong">
            <dt>{`Descuento (${Math.round(totals.discountRate * 100)}%)`}</dt>
            <dd className="tabular-nums">−{formatMoney(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        form={CHECKOUT_FORM_ID}
        disabled={paying}
        aria-busy={paying}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-bold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {paying ? "Procesando pago…" : "Pagar con Ripple"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">Demo: no se realiza ningún cobro.</p>
    </section>
  );
}
