export type ShareResult = "shared" | "cancelled" | "downloaded";

export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

// "Los del Viernes" -> "los-del-viernes"
export function fileSlug(projectName: string): string {
  const slug = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "mi-camiseta";
}

// "Los del Viernes" -> "los-del-viernes-historia.png"
export function storyFileName(projectName: string): string {
  return `${fileSlug(projectName)}-historia.png`;
}

export function shareText(url: string): string {
  return `Mirá mi camiseta. Diseñá la tuya en ${url}`;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError";
}

type ShareDeps = {
  nav?: ShareNavigator;
  download?: (blob: Blob, name: string) => void;
};

// The native share menu (WhatsApp, Instagram...) with the image attached when
// the browser can share files; otherwise, or if sharing fails, the file is
// downloaded. Closing the menu is not an error.
export async function shareImage(
  blob: Blob,
  { name, text }: { name: string; text: string },
  { nav = typeof navigator === "undefined" ? undefined : navigator, download = downloadBlob }: ShareDeps = {}
): Promise<ShareResult> {
  const file = new File([blob], name, { type: blob.type || "image/png" });
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }
  download(blob, name);
  return "downloaded";
}
