export const AGENCY_LOGO_BUCKET = "agency-logos";
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const ALLOWED_LOGO_TYPES = Object.keys(EXTENSION_BY_TYPE);

export function isValidLogoFile(file: File): boolean {
  return ALLOWED_LOGO_TYPES.includes(file.type) && file.size <= MAX_LOGO_BYTES;
}

// A new name on every upload so browsers never show a cached old logo.
export function buildLogoPath(agencyId: string, file: File, now: number = Date.now()): string {
  return `${agencyId}/logo-${now}.${EXTENSION_BY_TYPE[file.type]}`;
}

// Object path inside the bucket for a public logo URL, or null if the URL is not ours.
export function logoPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${AGENCY_LOGO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}
