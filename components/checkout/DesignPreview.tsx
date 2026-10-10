import Link from "next/link";
import type { Order } from "@/lib/checkout/order";
import { ShirtIcon } from "@/components/builder/icons";
import { AiTryOn } from "./AiTryOn";
import { CARD } from "./styles";

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
        <div className="grid grid-cols-2 gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
          <img src={thumbnails.front} alt="Camiseta de frente" className="w-full rounded-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
          <img src={thumbnails.back} alt="Camiseta de espalda" className="w-full rounded-2xl" />
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
