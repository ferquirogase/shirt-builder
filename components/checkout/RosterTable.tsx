"use client";
import { MAX_NAME_LENGTH, SIZES, newLineId, type OrderAction, type PlayerLine } from "@/lib/checkout/order";
import type { PlayerErrors } from "@/lib/checkout/validation";
import { BUTTON_ICON_CLASS, INPUT_CLASS } from "./styles";

type Props = {
  roster: PlayerLine[];
  errors: Record<string, PlayerErrors>;
  dispatch: (action: OrderAction) => void;
  // A full kit asks for a shorts size per player next to the shirt size.
  withShorts: boolean;
};

// One line per shirt: name, number, size and remove. The narrow number, size
// and remove columns on mobile keep every player to a single compact line.
const COLUMNS = "grid-cols-[minmax(0,1fr)_3rem_3.75rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_2.5rem]";
const COLUMNS_WITH_SHORTS =
  "grid-cols-[minmax(0,1fr)_3rem_3.75rem_3.75rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_6.5rem_2.5rem]";

function borderFor(error?: string) {
  return error ? "border-red-600" : "border-line";
}

type RowProps = {
  line: PlayerLine;
  n: number;
  error: PlayerErrors;
  canRemove: boolean;
  dispatch: (action: OrderAction) => void;
  withShorts: boolean;
};

function PlayerRow({ line, n, error, canRemove, dispatch, withShorts }: RowProps) {
  const nameErrorId = `${line.id}-name-error`;
  const numberErrorId = `${line.id}-number-error`;

  return (
    <li
      className={`grid ${withShorts ? COLUMNS_WITH_SHORTS : COLUMNS} items-center gap-1.5 rounded-2xl bg-white/70 p-1.5 md:gap-2 md:bg-transparent md:p-0`}
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

      {withShorts && (
        <select
          aria-label={`Talle del short del jugador ${n}`}
          value={line.shortsSize}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_PLAYER",
              id: line.id,
              patch: { shortsSize: e.target.value as PlayerLine["shortsSize"] },
            })
          }
          className={`${INPUT_CLASS} border-line max-md:px-1`}
        >
          {SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        aria-label={`Quitar jugador ${n}`}
        title="Quitar"
        disabled={!canRemove}
        onClick={() => dispatch({ type: "REMOVE_PLAYER", id: line.id })}
        className={`${BUTTON_ICON_CLASS} max-md:h-9 max-md:w-9 max-md:text-sm`}
      >
        ✕
      </button>

      {(error.name || error.number) && (
        <div className="col-span-full space-y-0.5 text-xs text-red-700 md:col-span-2">
          {error.name && <p id={nameErrorId}>{error.name}</p>}
          {error.number && <p id={numberErrorId}>{error.number}</p>}
        </div>
      )}
    </li>
  );
}

export function RosterTable({ roster, errors, dispatch, withShorts }: Props) {
  return (
    <div>
      <div
        aria-hidden="true"
        className={`mb-1 hidden gap-2 text-xs font-semibold text-muted md:grid ${withShorts ? COLUMNS_WITH_SHORTS : COLUMNS}`}
      >
        <span>Nombre</span>
        <span>Número</span>
        <span>Talle</span>
        {withShorts && <span>Talle short</span>}
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
            withShorts={withShorts}
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
