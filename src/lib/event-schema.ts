/**
 * Declarative per-event-type form schemas for the SIMPLE constructor (see
 * src/app/create2/*). This is the "EventType -> FormSchema" half of the
 * architecture described in the product spec: each EventCategory (see
 * lib/event-categories.ts — the ONE canonical 8-id list) that has a real,
 * approved form gets an entry here; everything else returns null so the
 * simple constructor can fall back to the advanced editor instead of
 * showing a broken/empty form.
 *
 * Deliberately NOT a chain of `if (category === "wedding") ... else if
 * (category === "sundettoi") ...` inside a UI component — every field the
 * customer sees is data here, not JSX. Adding a new event type later is a
 * new exported schema + one line in EVENT_FORM_SCHEMAS, never a component
 * rewrite.
 *
 * Field keys are chosen to line up 1:1 with existing Invite.data keys
 * wherever a matching concept already exists (groomName, brideName, date,
 * time, location, mapLink, invitationText) so the SAME renderer
 * (InvitePreview.tsx / the public /i/[slug] page) already knows how to
 * display them with zero changes. A handful of keys are genuinely new
 * (address, hosts, parents, note, age) — see ARCHITECTURE.md-equivalent
 * notes in the final report for exactly which renderer changes those
 * required.
 */

export type EventFieldType = "text" | "textarea" | "number" | "date" | "time" | "image" | "url";

export interface EventFormField {
  key: string;
  type: EventFieldType;
  required: boolean;
  labelKk: string;
  labelRu: string;
  placeholderKk?: string;
  placeholderRu?: string;
  order: number;
}

export interface EventFormSchema {
  eventCategoryId: string;
  fields: EventFormField[];
}

// ─── Wedding (§7 — approved) ────────────────────────────────────────────
const WEDDING_FORM_SCHEMA: EventFormSchema = {
  eventCategoryId: "wedding",
  fields: [
    { key: "groomName", type: "text", required: true, order: 1, labelKk: "Жігіттің аты", labelRu: "Имя жениха", placeholderKk: "Ерлан", placeholderRu: "Ерлан" },
    { key: "brideName", type: "text", required: true, order: 2, labelKk: "Қыздың аты", labelRu: "Имя невесты", placeholderKk: "Аружан", placeholderRu: "Аружан" },
    { key: "hosts", type: "text", required: true, order: 3, labelKk: "Той иелері", labelRu: "Организаторы торжества", placeholderKk: "Асан мен Гүлнара Сериковтар", placeholderRu: "Асан и Гульнара Сериковы" },
    { key: "date", type: "date", required: true, order: 4, labelKk: "Күні", labelRu: "Дата" },
    { key: "time", type: "time", required: true, order: 5, labelKk: "Уақыты", labelRu: "Время" },
    { key: "location", type: "text", required: true, order: 6, labelKk: "Тойхана атауы", labelRu: "Название банкетного зала", placeholderKk: "Ritz-Carlton", placeholderRu: "Ritz-Carlton" },
    { key: "address", type: "text", required: true, order: 7, labelKk: "Мекенжай", labelRu: "Адрес", placeholderKk: "Алматы, әл-Фараби даңғылы 77", placeholderRu: "Алматы, пр. аль-Фараби 77" },
    { key: "bgImageUrl", type: "image", required: true, order: 8, labelKk: "Негізгі фото", labelRu: "Главное фото" },
    { key: "mapLink", type: "url", required: false, order: 9, labelKk: "Карта сілтемесі", labelRu: "Ссылка на карту", placeholderKk: "https://2gis.kz/...", placeholderRu: "https://2gis.kz/..." },
    { key: "invitationText", type: "textarea", required: false, order: 10, labelKk: "Шақыру мәтіні", labelRu: "Текст приглашения" },
    { key: "programText", type: "textarea", required: false, order: 11, labelKk: "Бағдарлама", labelRu: "Программа" },
    { key: "note", type: "textarea", required: false, order: 12, labelKk: "Қосымша ескерту", labelRu: "Дополнительное примечание" },
  ],
};

// ─── Sundet toi (§8 — approved) ─────────────────────────────────────────
const SUNDET_FORM_SCHEMA: EventFormSchema = {
  eventCategoryId: "sundettoi",
  fields: [
    { key: "groomName", type: "text", required: true, order: 1, labelKk: "Баланың аты", labelRu: "Имя ребёнка", placeholderKk: "Алихан", placeholderRu: "Алихан" },
    { key: "parents", type: "text", required: true, order: 2, labelKk: "Ата-анасының аты", labelRu: "Имена родителей", placeholderKk: "Асан мен Гүлнара", placeholderRu: "Асан и Гульнара" },
    { key: "date", type: "date", required: true, order: 3, labelKk: "Күні", labelRu: "Дата" },
    { key: "time", type: "time", required: true, order: 4, labelKk: "Уақыты", labelRu: "Время" },
    { key: "location", type: "text", required: true, order: 5, labelKk: "Тойхана атауы", labelRu: "Название банкетного зала" },
    { key: "address", type: "text", required: true, order: 6, labelKk: "Мекенжай", labelRu: "Адрес" },
    { key: "bgImageUrl", type: "image", required: true, order: 7, labelKk: "Негізгі фото", labelRu: "Главное фото" },
    { key: "age", type: "text", required: false, order: 8, labelKk: "Жасы", labelRu: "Возраст", placeholderKk: "5 жас", placeholderRu: "5 лет" },
    { key: "hosts", type: "text", required: false, order: 9, labelKk: "Той иелері", labelRu: "Организаторы торжества" },
    { key: "mapLink", type: "url", required: false, order: 10, labelKk: "Карта сілтемесі", labelRu: "Ссылка на карту" },
    { key: "invitationText", type: "textarea", required: false, order: 11, labelKk: "Шақыру мәтіні", labelRu: "Текст приглашения" },
  ],
};

// Keyed by EventCategory.id (lib/event-categories.ts) — the ONE canonical
// event-type list. Only wedding/sundettoi are approved+implemented today
// (§7/§8); every other category intentionally has no entry yet (§8: "Do
// NOT invent final schemas for the other event categories yet") — the
// simple constructor falls back to the advanced editor for those.
const EVENT_FORM_SCHEMAS: Record<string, EventFormSchema> = {
  wedding: WEDDING_FORM_SCHEMA,
  sundettoi: SUNDET_FORM_SCHEMA,
};

export function getEventFormSchema(eventCategoryId: string): EventFormSchema | null {
  return EVENT_FORM_SCHEMAS[eventCategoryId] ?? null;
}

/**
 * Template FieldOverrides (§9): a template may narrow the base EventType
 * schema (e.g. hide/require a field differently) without duplicating it.
 * Not populated by any template today (no admin UI writes this yet — see
 * final report), but every consumer of getEventFormSchema()+applyFieldOverrides
 * already goes through this so a future per-template override UI is a
 * pure data addition, not a constructor rewrite.
 */
export interface TemplateFieldOverride {
  key: string;
  required?: boolean;
  hidden?: boolean;
}

export function applyFieldOverrides(
  schema: EventFormSchema,
  overrides: TemplateFieldOverride[] | undefined
): EventFormField[] {
  if (!overrides || overrides.length === 0) return schema.fields;
  const byKey = new Map(overrides.map((o) => [o.key, o]));
  return schema.fields
    .map((f) => {
      const o = byKey.get(f.key);
      if (!o) return f;
      return { ...f, required: o.required ?? f.required };
    })
    .filter((f) => {
      const o = byKey.get(f.key);
      return !o?.hidden;
    });
}
