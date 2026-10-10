"use client";
import { useEffect, useRef, useState } from "react";
import { buildAiPrompt } from "@/lib/checkout/ai-prompt";
import type { Order } from "@/lib/checkout/order";
import { loadDesignImages } from "@/lib/checkout/order-storage";
import { useHydrated } from "@/lib/checkout/use-hydrated";
import { fileSlug } from "@/lib/share/share-image";

const COPIED_MS = 2000;
const BUTTON =
  "inline-flex h-10 items-center justify-center rounded-full border border-foreground/80 bg-white/70 px-5 text-sm font-semibold hover:bg-accent-soft";

// Takes the design to an image AI: two big pictures of the shirt to attach, plus a
// prompt that asks for the user (or a friend, from a photo they attach) wearing it.
export function AiTryOn({ order }: { order: Order }) {
  const hydrated = useHydrated();
  const images = hydrated ? loadDesignImages() : null;
  const slug = fileSlug(order.design.projectName);

  // Until the user edits the text it follows the order (the first player's name and number).
  const [edited, setEdited] = useState<string | null>(null);
  const prompt = edited ?? buildAiPrompt(order);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // No clipboard access: leave the text selected so the user can copy it by hand.
      box.current?.select();
    }
  }

  return (
    <details className="mt-4 rounded-2xl bg-white/60 p-4">
      <summary className="cursor-pointer text-sm font-semibold">Probátela con tu IA favorita</summary>

      <div className="mt-3 space-y-4 text-sm">
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Descargá las imágenes de tu camiseta.</li>
          <li>Abrí tu IA favorita y pegá el prompt.</li>
          <li>Adjuntá las imágenes y una foto de la cara de quien la va a usar (vos o un amigo).</li>
        </ol>

        <div className="flex flex-wrap gap-3">
          {images ? (
            <>
              <a href={images.front} download={`${slug}-frente.jpg`} className={BUTTON}>
                Descargar frente
              </a>
              <a href={images.back} download={`${slug}-espalda.jpg`} className={BUTTON}>
                Descargar espalda
              </a>
            </>
          ) : (
            hydrated && (
              <p className="text-muted">
                No pudimos preparar las imágenes. Volvé a editar el diseño y revisalo de nuevo para generarlas.
              </p>
            )
          )}
        </div>

        <div>
          <label htmlFor="ai-prompt" className="mb-1 block font-semibold">
            Prompt de ejemplo
          </label>
          <textarea
            id="ai-prompt"
            ref={box}
            value={prompt}
            onChange={(e) => setEdited(e.target.value)}
            rows={9}
            className="w-full rounded-xl border bg-white p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
          />
          <button type="button" onClick={copy} className={`${BUTTON} mt-2`}>
            {copied ? "¡Copiado!" : "Copiar prompt"}
          </button>
        </div>
      </div>
    </details>
  );
}
