import type { Metadata } from "next";
import { PageTransition } from "@/components/PageTransition";
import { CheckoutPage } from "@/components/checkout/CheckoutPage";

export const metadata: Metadata = { title: "GEPE — Tu pedido" };

export default function Page() {
  return (
    <PageTransition>
      <main>
        <CheckoutPage />
      </main>
    </PageTransition>
  );
}
