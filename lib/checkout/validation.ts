import type { PlayerLine } from "./order";

export type ContactInfo = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
};

export const emptyContact: ContactInfo = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
};

export type PlayerErrors = { name?: string; number?: string };
export type OrderErrors = {
  players: Record<string, PlayerErrors>;
  contact: Partial<Record<keyof ContactInfo, string>>;
};

export const noErrors: OrderErrors = { players: {}, contact: {} };

const EMAIL = /^\S+@\S+\.\S+$/;
const NUMBER = /^\d{1,2}$/;

function validateRoster(roster: readonly PlayerLine[]): Record<string, PlayerErrors> {
  const players: Record<string, PlayerErrors> = {};
  const seen = new Map<number, number>();
  for (const line of roster) {
    if (NUMBER.test(line.number)) seen.set(Number(line.number), (seen.get(Number(line.number)) ?? 0) + 1);
  }

  for (const line of roster) {
    const errors: PlayerErrors = {};
    if (line.name.trim() === "") errors.name = "Ingresá un nombre";
    if (line.number === "") errors.number = "Ingresá un número";
    else if (!NUMBER.test(line.number)) errors.number = "Número de 0 a 99";
    else if ((seen.get(Number(line.number)) ?? 0) > 1) errors.number = "Número repetido";
    if (errors.name || errors.number) players[line.id] = errors;
  }
  return players;
}

function validateContact(contact: ContactInfo): OrderErrors["contact"] {
  const errors: OrderErrors["contact"] = {};
  for (const key of Object.keys(contact) as Array<keyof ContactInfo>) {
    if (contact[key].trim() === "") errors[key] = "Completá este campo";
  }
  if (!errors.email && !EMAIL.test(contact.email.trim())) errors.email = "Ingresá un email válido";
  return errors;
}

export function validateOrder(roster: readonly PlayerLine[], contact: ContactInfo): OrderErrors {
  return { players: validateRoster(roster), contact: validateContact(contact) };
}

export function hasErrors(errors: OrderErrors): boolean {
  return Object.keys(errors.players).length > 0 || Object.keys(errors.contact).length > 0;
}
