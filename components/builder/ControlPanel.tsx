"use client";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";

export function ControlPanel() {
  const { state, dispatch } = useDesign();

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        Patrón de cuerpo
        <select
          value={state.bodyPatternId}
          onChange={(e) => dispatch({ type: "SET_BODY_PATTERN", id: e.target.value })}
        >
          {BODY_PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Patrón de manga
        <select
          value={state.sleevePatternId}
          onChange={(e) => dispatch({ type: "SET_SLEEVE_PATTERN", id: e.target.value })}
        >
          {SLEEVE_PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Color primario
        <input
          type="color"
          value={state.colors.primary}
          onChange={(e) => dispatch({ type: "SET_COLOR", slot: "primary", value: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Color secundario
        <input
          type="color"
          value={state.colors.secondary}
          onChange={(e) => dispatch({ type: "SET_COLOR", slot: "secondary", value: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Sponsor (texto)
        <input
          type="text"
          value={state.sponsorText}
          onChange={(e) => dispatch({ type: "SET_SPONSOR_TEXT", value: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Logo (PNG/JPG, máx. 2MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert("El archivo supera los 2MB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              dispatch({ type: "SET_LOGO", dataUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        Nombre
        <input
          type="text"
          value={state.playerName}
          onChange={(e) => dispatch({ type: "SET_PLAYER_NAME", value: e.target.value.toUpperCase() })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Número
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={state.playerNumber}
          onChange={(e) => dispatch({ type: "SET_PLAYER_NUMBER", value: e.target.value.replace(/\D/g, "") })}
        />
      </label>
    </div>
  );
}
