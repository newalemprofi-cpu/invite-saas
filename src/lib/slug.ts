const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  // Kazakh-specific
  ә: "a", ғ: "g", қ: "q", ң: "ng", ө: "o", ұ: "u", ү: "u", і: "i",
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => CYRILLIC[c] ?? c)
    .join("");
}

function slugify(text: string): string {
  return transliterate(text)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function generateInviteSlug(person1: string, person2?: string): string {
  const parts = [person1, person2]
    .filter(Boolean)
    .map((p) => slugify(p!))
    .filter(Boolean);
  const base = parts.join("-") || "invite";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
