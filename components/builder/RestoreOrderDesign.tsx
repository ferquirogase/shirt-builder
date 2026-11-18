"use client";
import { useEffect } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { withDesignDefaults } from "@/lib/builder/state/design-defaults";
import { loadDraft } from "@/lib/builder/state/design-draft";
import { loadOrder } from "@/lib/checkout/order-storage";

// Coming back from the checkout ("Editar diseño"), the builder opens with the
// design of the saved order. It runs after mount (not in the initial state) so
// the server and first client render match. The autosaved draft, when there is one, is at least as new
// (the order was made from it), so then the draft is opened instead (see DraftKeeper).
export function RestoreOrderDesign() {
  const { dispatch } = useDesign();
  useEffect(() => {
    const order = loadOrder();
    if (order && !loadDraft()) {
      // Filled in like any saved design: an older order may lack the border's color, among others.
      dispatch({ type: "LOAD_DESIGN", design: withDesignDefaults(order.design) });
    }
  }, [dispatch]);
  return null;
}
