import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/CheckoutPage";

export const metadata: Metadata = { title: "GEPE — Tu pedido" };

export default function Page() {
  return (
    <main>
      <CheckoutPage />
    </main>
  );
}
