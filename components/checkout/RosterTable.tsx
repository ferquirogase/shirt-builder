"use client";
import { useState } from "react";
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

// One column per control from md up. Below md a player is a single compact
// line (name, number, size, ⋯, remove); quantity and duplicate fold into a
// panel under the line that the ⋯ button opens.
const DESKTOP_COLUMNS = "md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_8rem_2.5rem_2.5rem]";

function borderFor(error?: string) {
  return error ? "border-red-600" : "border-line";
}

type RowProps = {
  line: PlayerLine;
  n: number;
  error: PlayerErrors;
  canRemove: boolean;
  dispatch: (action: OrderAction) => void;
};

function PlayerRow({ line, n, error, canRemove, dispatch }: RowProps) {
  const [open, setOpen] = useState(false);
  const nameErrorId = `${line.id}-name-error`;
  const numberErrorId = `${line.id}-number-error`;
  const panelId = `${line.id}-more`;

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_3rem_3.75rem_2.25rem_2.25rem] items-center gap-1.5 rounded-2xl bg-white/70 p-1.5 md:gap-2 md:bg-transparent md:p-0 ${DESKTOP_COLUMNS}`}
    >
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
        className={`${INPUT_CLASS} ${borderFor(error.number)} max-md:px-1 max-md:text-center`}
      />

      <select
        aria-label={`Talle del jugador ${n}`}
        value={line.size}
        onChange={(e) =>
          dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { size: e.target.value as PlayerLine["size"] } })
        }
        className={`${INPUT_CLASS} border-line max-md:px-1`}
      >
        {SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-label={`Más opciones del jugador ${n}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`${BUTTON_ICON_CLASS} max-md:h-9 max-md:w-9 max-md:text-sm md:hidden`}
      >
        {line.quantity > 1 ? `×${line.quantity}` : "⋯"}
      </button>

      {/* Quitar stays in the line; from md up it goes after the panel's columns. */}
      <button
        type="button"
        aria-label={`Quitar jugador ${n}`}
        title="Quitar"
        disabled={!canRemove}
        onClick={() => dispatch({ type: "REMOVE_PLAYER", id: line.id })}
        className={`${BUTTON_ICON_CLASS} max-md:h-9 max-md:w-9 max-md:text-sm md:order-1`}
      >
        ✕
      </button>

      <div
        id={panelId}
        className={`col-span-full flex items-center justify-between rounded-xl bg-white/60 px-2 py-1 md:contents ${
          open ? "" : "max-md:hidden"
        }`}
      >
        <div role="group" aria-label={`Cantidad del jugador ${n}`} className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Menos camisetas del jugador ${n}`}
            disabled={line.quantity <= 1}
            onClick={() => dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { quantity: line.quantity - 1 } })}
            className={BUTTON_ICON_CLASS}
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
          <button
            type="button"
            aria-label={`Más camisetas del jugador ${n}`}
            disabled={line.quantity >= MAX_QUANTITY}
            onClick={() => dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { quantity: line.quantity + 1 } })}
            className={BUTTON_ICON_CLASS}
          >
            +
          </button>
        </div>
        <button
          type="button"
          aria-label={`Duplicar jugador ${n}`}
          title="Duplicar"
          onClick={() => dispatch({ type: "DUPLICATE_PLAYER", id: line.id, newId: newLineId() })}
          className={BUTTON_ICON_CLASS}
        >
          ⧉
        </button>
      </div>

      {(error.name || error.number) && (
        <div className="col-span-full space-y-0.5 text-xs text-red-700 md:order-2 md:col-span-2">
          {error.name && <p id={nameErrorId}>{error.name}</p>}
          {error.number && <p id={numberErrorId}>{error.number}</p>}
        </div>
      )}
    </li>
  );
}

export function RosterTable({ roster, errors, dispatch }: Props) {
  return (
    <div>
      <div
        aria-hidden="true"
        className={`mb-1 hidden gap-2 text-xs font-semibold text-muted md:grid ${DESKTOP_COLUMNS}`}
      >
        <span>Nombre</span>
        <span>Número</span>
        <span>Talle</span>
        <span>Cantidad</span>
        <span />
        <span />
      </div>

      <ul className="space-y-2">
        {roster.map((line, index) => (
          <PlayerRow
            key={line.id}
            line={line}
            n={index + 1}
            error={errors[line.id] ?? {}}
            canRemove={roster.length > 1}
            dispatch={dispatch}
          />
        ))}
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
