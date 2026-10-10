"use client";
import Link from "next/link";
import { useState } from "react";
import { loadOrder } from "@/lib/checkout/order-storage";
import { useHydrated } from "@/lib/checkout/use-hydrated";
import { CheckoutShell } from "./CheckoutShell";
import { CheckoutView } from "./CheckoutView";
import { CARD } from "./styles";

function SavedOrder() {
  // Read once, only on the client after hydration (see useHydrated).
  const [order] = useState(loadOrder);
  if (!order) {
    return (
      <CheckoutShell title="Tu pedido">
        <div className={`${CARD} mt-4 text-center`}>
          <p className="mb-4">No hay ningún pedido en curso.</p>
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold transition-colors hover:bg-accent-strong"
          >
            Volver a diseñar
          </Link>
        </div>
      </CheckoutShell>
    );
  }
  return <CheckoutView initial={order} />;
}

export function CheckoutPage() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <CheckoutShell title="Tu pedido">
        <p role="status" className="mt-4 text-sm text-muted">
          Cargando tu pedido…
        </p>
      </CheckoutShell>
    );
  }
  return <SavedOrder />;
}
