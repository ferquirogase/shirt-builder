"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import { formatMoney, pricePerPlayer } from "@/lib/checkout/pricing";
import { ShirtIcon, ShortsIcon } from "../icons";
import { PanelShell } from "./PanelShell";

// What is bought comes first: it decides the price, what the viewer shows and the
// sizes the checkout asks for. The design is built after that.
const KIT_OPTIONS = [
  { id: "shirt", included: false, label: "Solo camiseta", showShorts: false },
  { id: "kit", included: true, label: "Camiseta + short", showShorts: true },
] as const;

const OPTION = "flex items-center gap-3 rounded-2xl border-2 bg-white/70 p-3 text-left text-sm font-medium";
const border = (checked: boolean) => (checked ? "border-foreground" : "border-transparent hover:border-line");

export function GarmentsPanel() {
  const { state, dispatch } = useDesign();
  const { included } = state.shorts;

  return (
    <PanelShell title="Prendas" hint="Elegí qué llevás. El diseño viene después.">
      <p id="kit-question" className="mb-3 text-sm font-semibold">
        ¿Qué querés comprar?
      </p>
      {/* Side by side on a phone, where the panel is short and both options must be in view at once. */}
      <div role="radiogroup" aria-labelledby="kit-question" className="grid grid-cols-2 gap-3 md:grid-cols-1">
        {KIT_OPTIONS.map((option) => {
          const checked = included === option.included;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-labelledby={`${option.id}-label`}
              aria-describedby={`${option.id}-price`}
              onClick={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: option.included })}
              className={`${OPTION} ${border(checked)} flex-col items-start p-3 md:flex-row md:items-center md:p-4`}
            >
              <span aria-hidden="true" className="flex shrink-0 gap-1 text-foreground">
                <ShirtIcon className="h-8 w-8" />
                {option.showShorts && <ShortsIcon className="h-8 w-8" />}
              </span>
              <span className="flex flex-col">
                <span id={`${option.id}-label`} className="text-base font-semibold">
                  {option.label}
                </span>
                <span id={`${option.id}-price`} className="font-normal text-muted">
                  {formatMoney(pricePerPlayer(option.included))} por jugador
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={state.keeper.included}
        aria-labelledby="keeper-label"
        aria-describedby="keeper-hint"
        onClick={() => dispatch({ type: "SET_KEEPER_INCLUDED", value: !state.keeper.included })}
        className={`${OPTION} ${border(state.keeper.included)} mt-3 w-full justify-between md:p-4`}
      >
        <span className="flex flex-col">
          <span id="keeper-label" className="text-base font-semibold">
            Sumar camiseta de arquero
          </span>
          <span id="keeper-hint" className="font-normal text-muted">
            Colores y patrón propios. Comparte escudo y sponsors.
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            state.keeper.included ? "bg-foreground" : "bg-black/20"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
              state.keeper.included ? "translate-x-5" : ""
            }`}
          />
        </span>
      </button>
    </PanelShell>
  );
}
