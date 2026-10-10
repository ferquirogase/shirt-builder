"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/builder/icons";
import { clearConfirmation, loadConfirmation } from "@/lib/checkout/order-storage";
import { formatMoney } from "@/lib/checkout/pricing";
import { useHydrated } from "@/lib/checkout/use-hydrated";
import { CheckoutShell } from "./CheckoutShell";
import { CARD } from "./styles";

function SavedConfirmation() {
  const router = useRouter();
  const [confirmation] = useState(loadConfirmation);

  useEffect(() => {
    if (!confirmation) router.replace("/");
  }, [confirmation, router]);

  if (!confirmation) return null;

  return (
    <CheckoutShell title="Pedido confirmado">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className={`${CARD} text-center`}>
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 className="text-xl font-bold">¡Gracias por tu pedido!</h2>
          <p className="mt-1 text-sm text-muted">
            Número de pedido <span className="font-mono font-bold text-foreground">{confirmation.number}</span>
          </p>
          <p className="mt-1 text-sm text-muted">Te enviaremos el detalle a {confirmation.email}.</p>
          <p className="mt-3 rounded-xl bg-accent-soft p-2 text-xs">Demo: no se realizó ningún cobro.</p>
        </section>

        <section aria-label="Detalle del pedido" className={CARD}>
          <h2 className="mb-3 text-lg font-bold">{confirmation.projectName}</h2>
          <ul className="divide-y divide-line text-sm">
            {confirmation.roster.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate font-semibold">{line.name}</span>
                <span className="shrink-0 text-muted">
                  N° {line.number} · {line.size}
                  {confirmation.shorts > 0 && ` · Short ${line.shortsSize}`}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(confirmation.total)}</dd>
          </dl>
        </section>

        <div className="text-center">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            onClick={clearConfirmation}
            className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-bold transition-colors hover:bg-accent-strong"
          >
            Diseñar otra camiseta
          </Link>
        </div>
      </div>
    </CheckoutShell>
  );
}

export function ConfirmationPage() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <SavedConfirmation />;
}
