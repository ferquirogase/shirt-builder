"use client";
import type { FormEvent } from "react";
import type { ContactInfo } from "@/lib/checkout/validation";
import { TextField } from "./Field";

export const CHECKOUT_FORM_ID = "checkout-form";

type FieldSpec = {
  key: keyof ContactInfo;
  label: string;
  type?: string;
  autoComplete: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  wide?: boolean;
};

const FIELDS: ReadonlyArray<FieldSpec> = [
  { key: "fullName", label: "Nombre y apellido", autoComplete: "name", wide: true },
  { key: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
  { key: "phone", label: "Teléfono", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { key: "address", label: "Dirección de envío", autoComplete: "street-address", wide: true },
  { key: "city", label: "Ciudad", autoComplete: "address-level2" },
  { key: "postalCode", label: "Código postal", autoComplete: "postal-code", inputMode: "numeric" },
];

type Props = {
  contact: ContactInfo;
  errors: Partial<Record<keyof ContactInfo, string>>;
  onChange: (field: keyof ContactInfo, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

// noValidate: the browser's own bubbles are replaced by our messages, which
// are linked to each field and announced.
export function ContactForm({ contact, errors, onChange, onSubmit }: Props) {
  return (
    <form id={CHECKOUT_FORM_ID} noValidate onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map(({ key, label, type, autoComplete, inputMode, wide }) => (
        <div key={key} className={wide ? "sm:col-span-2" : undefined}>
          <TextField
            id={`contact-${key}`}
            label={label}
            type={type}
            autoComplete={autoComplete}
            inputMode={inputMode}
            value={contact[key]}
            error={errors[key]}
            onChange={(value) => onChange(key, value)}
          />
        </div>
      ))}
    </form>
  );
}
