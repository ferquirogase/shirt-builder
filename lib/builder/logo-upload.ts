export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

// Returns a user-facing error message, or null when the file is acceptable.
export function validateLogoFile(file: { size: number; type: string }): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return "Formato no válido. Usá PNG, JPG o SVG.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "El archivo supera los 2 MB.";
  }
  return null;
}
