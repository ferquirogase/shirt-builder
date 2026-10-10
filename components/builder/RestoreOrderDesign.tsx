"use client";
import { useEffect } from "react";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { useDesign } from "@/lib/builder/state/design-context";
import { loadOrder } from "@/lib/checkout/order-storage";

// Coming back from the checkout ("Editar diseño"), the builder opens with the
// design of the saved order. It runs after mount (not in the initial state) so
// the server and first client render match.
export function RestoreOrderDesign() {
  const { dispatch } = useDesign();
  useEffect(() => {
    const order = loadOrder();
    if (order) dispatch({ type: "LOAD_DESIGN", design: { ...initialDesignState, ...order.design } });
  }, [dispatch]);
  return null;
}
