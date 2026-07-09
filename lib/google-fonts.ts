/**
 * Google Fonts loaded into the customer editor (Phase 7).
 * Loaded via a <link> tag injected at editor mount time so the fonts
 * never bloat the admin dashboard.
 */

export type EditorFont = {
  name: string;
  cssFamily: string;
  google: boolean;
};

export const SYSTEM_FONTS: EditorFont[] = [
  { name: "Arial", cssFamily: "Arial, sans-serif", google: false },
  { name: "Georgia", cssFamily: "Georgia, serif", google: false },
  { name: "Times New Roman", cssFamily: "'Times New Roman', serif", google: false },
  { name: "Courier New", cssFamily: "'Courier New', monospace", google: false },
];

export const GOOGLE_FONTS: EditorFont[] = [
  "Playfair Display",
  "Merriweather",
  "Lora",
  "EB Garamond",
  "Libre Baskerville",
  "Raleway",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Lato",
  "Open Sans",
  "Oswald",
  "Bebas Neue",
  "Dancing Script",
  "Pacifico",
  "Sacramento",
  "Great Vibes",
  "Lobster",
  "Satisfy",
  "Abril Fatface",
  "Cinzel",
  "Cormorant Garamond",
  "Josefin Sans",
  "Quicksand",
  "Righteous",
  "Permanent Marker",
].map((name) => ({
  name,
  cssFamily: `'${name}', sans-serif`,
  google: true,
}));

export const ALL_EDITOR_FONTS: EditorFont[] = [...SYSTEM_FONTS, ...GOOGLE_FONTS];

export function googleFontsHref(): string {
  const families = GOOGLE_FONTS.map((f) =>
    `family=${f.name.replace(/ /g, "+")}:wght@400;700`
  ).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Build a Google Fonts CSS URL for an arbitrary list of family names.
 * Used by the template editor to load whatever fonts the admin's SVG
 * actually uses, regardless of whether they're in our curated picker.
 */
export function googleFontsHrefFor(families: string[]): string | null {
  const clean = families
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
  if (!clean.length) return null;
  const params = clean
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

// Static list of all ~1500 Google Fonts family names, generated from
// the public Google Fonts directory. Used by the template builder to
// warn admins when an SVG references a font that isn't on Google
// Fonts (and therefore won't render correctly in the customer editor).
import googleFontsListJson from "./google-fonts-list.json";

const GOOGLE_FONTS_SET = new Set<string>(
  (googleFontsListJson as string[]).map((s) => s.toLowerCase())
);

export function isGoogleFont(family: string): boolean {
  return GOOGLE_FONTS_SET.has(family.trim().toLowerCase());
}

export type FontCheckResult = {
  family: string;
  available: boolean;
};

export function checkFonts(families: string[]): FontCheckResult[] {
  return families.map((family) => ({
    family,
    available: isGoogleFont(family),
  }));
}
