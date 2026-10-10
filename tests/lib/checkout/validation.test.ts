import { describe, it, expect } from "vitest";
import { createPlayerLine } from "@/lib/checkout/order";
import { emptyContact, hasErrors, validateOrder, type ContactInfo } from "@/lib/checkout/validation";

const contact: ContactInfo = {
  fullName: "Leo Messi",
  email: "leo@club.com",
  phone: "1155550000",
  address: "Av. Siempre Viva 742",
  city: "Rosario",
  postalCode: "2000",
};
const player = (id: string, name: string, number: string) => createPlayerLine(id, { name, number });

describe("validateOrder", () => {
  it("accepts a complete order", () => {
    const errors = validateOrder([player("a", "Leo", "10"), player("b", "Dibu", "1")], contact);
    expect(hasErrors(errors)).toBe(false);
  });

  it("asks for a name and a number on every player", () => {
    const errors = validateOrder([player("a", "  ", ""), player("b", "Dibu", "1")], contact);
    expect(errors.players.a).toEqual({ name: "Ingresá un nombre", number: "Ingresá un número" });
    expect(errors.players.b).toBeUndefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it("flags repeated numbers on every line that has them, treating 07 and 7 as equal", () => {
    const errors = validateOrder([player("a", "Leo", "7"), player("b", "Dibu", "07"), player("c", "Otro", "9")], contact);
    expect(errors.players.a?.number).toBe("Número repetido");
    expect(errors.players.b?.number).toBe("Número repetido");
    expect(errors.players.c).toBeUndefined();
  });

  it("accepts 0 as a number", () => {
    expect(hasErrors(validateOrder([player("a", "Leo", "0")], contact))).toBe(false);
  });

  it("rejects a number that is not 0 to 99", () => {
    const errors = validateOrder([player("a", "Leo", "100"), player("b", "Dibu", "x")], contact);
    expect(errors.players.a?.number).toBe("Número de 0 a 99");
    expect(errors.players.b?.number).toBe("Número de 0 a 99");
  });

  it("requires every contact field and a plausible email", () => {
    const errors = validateOrder([player("a", "Leo", "10")], emptyContact);
    expect(Object.keys(errors.contact).sort()).toEqual(
      ["address", "city", "email", "fullName", "phone", "postalCode"].sort()
    );
    expect(errors.contact.fullName).toBe("Completá este campo");

    const badEmail = validateOrder([player("a", "Leo", "10")], { ...contact, email: "leo@club" });
    expect(badEmail.contact).toEqual({ email: "Ingresá un email válido" });
  });

  it("treats whitespace-only contact fields as empty", () => {
    const errors = validateOrder([player("a", "Leo", "10")], { ...contact, city: "   " });
    expect(errors.contact).toEqual({ city: "Completá este campo" });
  });
});
