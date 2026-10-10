import type { Metadata } from "next";
import { ConfirmationPage } from "@/components/checkout/ConfirmationPage";

export const metadata: Metadata = { title: "GEPE — Pedido confirmado" };

export default function Page() {
  return (
    <main>
      <ConfirmationPage />
    </main>
  );
}
