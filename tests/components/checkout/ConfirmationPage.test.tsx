import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ConfirmationPage } from "@/components/checkout/ConfirmationPage";
import { createPlayerLine, type Confirmation } from "@/lib/checkout/order";
import { clearConfirmation, loadConfirmation, saveConfirmation } from "@/lib/checkout/order-storage";

const confirmation: Confirmation = {
  number: "GEPE-ABC234",
  email: "leo@club.com",
  projectName: "Los del viernes",
  shirts: 3,
  shorts: 0,
  total: 105,
  roster: [
    createPlayerLine("a", { name: "Leo", number: "10", size: "L" }),
    createPlayerLine("b", { name: "Dibu", number: "1" }),
  ],
};

beforeEach(() => {
  clearConfirmation();
  replace.mockReset();
});

describe("ConfirmationPage", () => {
  it("shows each player's shorts size for a full kit, and none for shirt only", () => {
    saveConfirmation({ ...confirmation, shorts: 2, roster: confirmation.roster.map((line) => ({ ...line, shortsSize: "L" as const })) });
    const { unmount } = render(<ConfirmationPage />);
    expect(screen.getAllByText(/Short L/)).toHaveLength(2);
    unmount();
    saveConfirmation(confirmation);
    render(<ConfirmationPage />);
    expect(screen.queryByText(/Short/)).toBeNull();
  });

  it("shows the order number, the email, the roster and the total, and says nothing was charged", () => {
    saveConfirmation(confirmation);
    render(<ConfirmationPage />);
    expect(screen.getByText("GEPE-ABC234")).toBeInTheDocument();
    expect(screen.getByText(/leo@club\.com/)).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
    expect(screen.getByText("Dibu")).toBeInTheDocument();
    // One shirt per line: no per-line quantity.
    expect(screen.queryByText(/·\s*x\d+/)).toBeNull();
    expect(screen.getByText(/Demo: no se realizó ningún cobro/)).toBeInTheDocument();
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("105");
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes back to the builder when there is no confirmation to show", async () => {
    render(<ConfirmationPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("'Diseñar otra camiseta' forgets the confirmation and links to the builder", () => {
    saveConfirmation(confirmation);
    render(<ConfirmationPage />);
    const link = screen.getByRole("link", { name: "Diseñar otra camiseta" });
    expect(link).toHaveAttribute("href", "/");
    fireEvent.click(link);
    expect(loadConfirmation()).toBeNull();
  });
});

describe("ConfirmationPage keeper", () => {
  it("marks the keeper's line", () => {
    saveConfirmation({
      ...confirmation,
      roster: [{ ...confirmation.roster[0], keeper: true }, confirmation.roster[1]],
    });
    render(<ConfirmationPage />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Arquero");
    expect(rows[1]).not.toHaveTextContent("Arquero");
  });
});
