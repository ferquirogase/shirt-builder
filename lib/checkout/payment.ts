import type { Confirmation, Order } from "./order";
import { pause } from "./pause";
import { orderTotals } from "./pricing";
import type { ContactInfo } from "./validation";

export const SIMULATED_PAYMENT_MS = 1500;

// No 0/O or 1/I: easy to misread over the phone.
const ORDER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function orderNumber(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += ORDER_CHARS[Math.floor(random() * ORDER_CHARS.length)];
  return `GEPE-${code}`;
}

// The seam for the Ripple integration. Today it only waits and invents an
// order number; the real version creates the payment and resolves (or throws)
// with the same Confirmation shape.
export async function payWithRipple(
  order: Order,
  contact: ContactInfo,
  wait: (ms: number) => Promise<void> = pause
): Promise<Confirmation> {
  await wait(SIMULATED_PAYMENT_MS);
  const totals = orderTotals(order.roster);
  return {
    number: orderNumber(),
    email: contact.email.trim(),
    projectName: order.design.projectName,
    shirts: totals.shirts,
    total: totals.total,
    roster: order.roster,
  };
}
