import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// The builder autosaves its design in localStorage: no test may open another one's design.
afterEach(() => localStorage.clear());
