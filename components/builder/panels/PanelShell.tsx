import type { ReactNode } from "react";
import { InfoIcon } from "../icons";

type Props = { title: string; hint?: string; children: ReactNode };

export function PanelShell({ title, hint, children }: Props) {
  return (
    <section aria-label={title} className="flex flex-col p-5">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      {children}
      {hint && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <InfoIcon className="h-4 w-4 shrink-0" />
          {hint}
        </p>
      )}
    </section>
  );
}
