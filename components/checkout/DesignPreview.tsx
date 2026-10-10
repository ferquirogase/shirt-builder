import Link from "next/link";
import type { Order } from "@/lib/checkout/order";
import { ShirtIcon } from "@/components/builder/icons";
import { AiTryOn } from "./AiTryOn";
import { CARD } from "./styles";

// Small square previews: the front and the back of one shirt. The full-size photos are a
// download in the AI section; here they only need to be recognizable.
function Pair({ label, front, back, what }: { label: string | null; front: string; back: string; what: string }) {
  const photo = "aspect-square w-[4.25rem] rounded-xl object-cover object-center sm:w-24";
  return (
    <div>
      {label && <h3 className="mb-1.5 text-xs font-semibold text-muted">{label}</h3>}
      <div className="flex gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
        <img src={front} alt={`${what} de frente`} className={photo} />
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
        <img src={back} alt={`${what} de espalda`} className={photo} />
      </div>
    </div>
  );
}

export function DesignPreview({ order }: { order: Order }) {
  const { thumbnails, design } = order;
  return (
    <section aria-label="Tu diseño" className={CARD}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-lg font-bold">{design.projectName}</h2>
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="inline-flex h-10 shrink-0 items-center rounded-full border border-foreground/80 bg-white/70 px-5 text-sm font-semibold hover:bg-accent-soft"
        >
          Editar diseño
        </Link>
      </div>

      {thumbnails ? (
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <Pair label={design.keeper.included ? "Jugador" : null} front={thumbnails.front} back={thumbnails.back} what="Camiseta" />
          {design.keeper.included && order.keeperThumbnails && (
            <Pair
              label="Arquero"
              front={order.keeperThumbnails.front}
              back={order.keeperThumbnails.back}
              what="Camiseta del arquero"
            />
          )}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-white/60 text-muted">
          <ShirtIcon className="h-10 w-10" />
          <span className="text-sm">Sin vista previa</span>
        </div>
      )}

      <AiTryOn order={order} />
    </section>
  );
}
