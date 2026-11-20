// The papers TuneVerse prints on. "light" and "dark" are the names next-themes uses
// when it follows the device, so they double as day print and night print.
export const PAPERS = [
    { id: "light", attr: "day", name: "Day print", swatch: "#f2f3f5" },
    { id: "blush", attr: "blush", name: "Blush", swatch: "#fbdde9" },
    { id: "dark", attr: "night", name: "Night print", swatch: "#0e1647" },
    { id: "black", attr: "black", name: "Black stock", swatch: "#121216" },
] as const;

export const PAPER_ATTRIBUTE_VALUES: Record<string, string> = Object.fromEntries(PAPERS.map((paper) => [paper.id, paper.attr]));
