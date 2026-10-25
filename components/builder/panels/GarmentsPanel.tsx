"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import { formatMoney, pricePerPlayer } from "@/lib/checkout/pricing";
import { PanelShell } from "./PanelShell";

// What is bought comes first: it decides the price, what the viewer shows and the
// sizes the checkout asks for. The design is built after that.
const KIT_OPTIONS = [
  { id: "shirt", included: false, label: "Solo camiseta", icon: "/icons/sections/kit-shirt-v2.webp" },
  { id: "kit", included: true, label: "Camiseta + short", icon: "/icons/sections/kit-kit.webp" },
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
              {/* Same square box for both images, so the options stay the same size. */}
              <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center">
                <img src={option.icon} alt="" className="h-full w-full object-contain" />
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

      {/* Icon, title and switch share the first row; the hint takes the full width below so the text is not squeezed between them. */}
      <button
        type="button"
        role="switch"
        aria-checked={state.keeper.included}
        aria-labelledby="keeper-label"
        aria-describedby="keeper-hint"
        onClick={() => dispatch({ type: "SET_KEEPER_INCLUDED", value: !state.keeper.included })}
        className={`${OPTION} ${border(state.keeper.included)} mt-3 grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 md:p-4`}
      >
        {/* Smaller than the kit images: this row also holds the text and the switch. */}
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center">
          <img src="/icons/sections/kit-gloves.webp" alt="" className="h-full w-full object-contain" />
        </span>
        <span id="keeper-label" className="text-base font-semibold leading-tight">
          Sumar camiseta de arquero
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
        <span id="keeper-hint" className="col-span-3 font-normal text-muted">
          Colores y patrón propios. Comparte escudo y sponsors.
        </span>
      </button>
    </PanelShell>
  );
}
