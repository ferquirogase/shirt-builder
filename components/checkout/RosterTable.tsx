"use client";
import {
  MAX_NAME_LENGTH,
  MAX_QUANTITY,
  SIZES,
  newLineId,
  type OrderAction,
  type PlayerLine,
} from "@/lib/checkout/order";
import type { PlayerErrors } from "@/lib/checkout/validation";
import { BUTTON_ICON_CLASS, INPUT_CLASS } from "./styles";

type Props = {
  roster: PlayerLine[];
  errors: Record<string, PlayerErrors>;
  dispatch: (action: OrderAction) => void;
};

function borderFor(error?: string) {
  return error ? "border-red-600" : "border-line";
}

export function RosterTable({ roster, errors, dispatch }: Props) {
  return (
    <div>
      <div
        aria-hidden="true"
        className="mb-1 hidden gap-2 text-xs font-semibold text-muted md:grid md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_8rem_5.5rem]"
      >
        <span>Nombre</span>
        <span>Número</span>
        <span>Talle</span>
        <span>Cantidad</span>
        <span />
      </div>

      <ul className="space-y-3">
        {roster.map((line, index) => {
          const n = index + 1;
          const error = errors[line.id] ?? {};
          const nameErrorId = `${line.id}-name-error`;
          const numberErrorId = `${line.id}-number-error`;
          return (
            <li
              key={line.id}
              className="grid grid-cols-[minmax(0,1fr)_5rem] items-start gap-2 rounded-2xl bg-white/70 p-3 md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_8rem_5.5rem] md:bg-transparent md:p-0"
            >
              <div>
                <input
                  type="text"
                  aria-label={`Nombre del jugador ${n}`}
                  placeholder="Nombre"
                  value={line.name}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="off"
                  aria-invalid={error.name ? true : undefined}
                  aria-describedby={error.name ? nameErrorId : undefined}
                  onChange={(e) => dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { name: e.target.value } })}
                  className={`${INPUT_CLASS} ${borderFor(error.name)}`}
                />
                {error.name && (
                  <p id={nameErrorId} className="mt-1 text-xs text-red-700">
                    {error.name}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`Número del jugador ${n}`}
                  placeholder="N°"
                  value={line.number}
                  autoComplete="off"
                  aria-invalid={error.number ? true : undefined}
                  aria-describedby={error.number ? numberErrorId : undefined}
                  onChange={(e) => dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { number: e.target.value } })}
                  className={`${INPUT_CLASS} ${borderFor(error.number)}`}
                />
                {error.number && (
                  <p id={numberErrorId} className="mt-1 text-xs text-red-700">
                    {error.number}
                  </p>
                )}
              </div>

              <select
                aria-label={`Talle del jugador ${n}`}
                value={line.size}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { size: e.target.value as PlayerLine["size"] } })
                }
                className={`${INPUT_CLASS} border-line`}
              >
                {SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <div role="group" aria-label={`Cantidad del jugador ${n}`} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Menos camisetas del jugador ${n}`}
                  disabled={line.quantity <= 1}
                  onClick={() =>
                    dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { quantity: line.quantity - 1 } })
                  }
                  className={BUTTON_ICON_CLASS}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                <button
                  type="button"
                  aria-label={`Más camisetas del jugador ${n}`}
                  disabled={line.quantity >= MAX_QUANTITY}
                  onClick={() =>
                    dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { quantity: line.quantity + 1 } })
                  }
                  className={BUTTON_ICON_CLASS}
                >
                  +
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  aria-label={`Duplicar jugador ${n}`}
                  title="Duplicar"
                  onClick={() => dispatch({ type: "DUPLICATE_PLAYER", id: line.id, newId: newLineId() })}
                  className={BUTTON_ICON_CLASS}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  aria-label={`Quitar jugador ${n}`}
                  title="Quitar"
                  disabled={roster.length <= 1}
                  onClick={() => dispatch({ type: "REMOVE_PLAYER", id: line.id })}
                  className={BUTTON_ICON_CLASS}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => dispatch({ type: "ADD_PLAYER", id: newLineId() })}
        className="mt-4 inline-flex h-10 items-center rounded-full border border-foreground/80 bg-white/70 px-5 text-sm font-semibold hover:bg-accent-soft"
      >
        <span aria-hidden="true">+ </span>Agregar jugador
      </button>
    </div>
  );
}
