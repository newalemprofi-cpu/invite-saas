/**
 * Minimal customer-facing localization helper.
 *
 * There is no formal i18n library in this project — language is threaded
 * through the existing `?lang=` query param convention (already used by
 * /templates, /templates/[slug] and the onboarding quiz). This module just
 * standardizes reading that param and provides shared copy used in more
 * than one place (nav labels, generic errors).
 */

export type Lang = "kk" | "ru";

export function resolveLang(input: string | string[] | undefined | null): Lang {
  const v = Array.isArray(input) ? input[0] : input;
  return v === "ru" ? "ru" : "kk";
}

/** Appends/overrides `lang` on a relative URL, preserving other params. */
export function withLang(path: string, lang: Lang): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  return `${base}?${params.toString()}`;
}

export const COMMON = {
  kk: {
    myInvitations: "Менің шақыруларым",
    login: "Кіру",
    register: "Тіркелу",
    logout: "Шығу",
    admin: "Admin",
    back: "Артқа",
    save: "Сақтау",
    cancel: "Бас тарту",
    loading: "Жүктелуде...",
    networkError: "Желі қатесі. Қайталаңыз.",
    genericError: "Қате орын алды",
  },
  ru: {
    myInvitations: "Мои приглашения",
    login: "Войти",
    register: "Регистрация",
    logout: "Выйти",
    admin: "Admin",
    back: "Назад",
    save: "Сохранить",
    cancel: "Отмена",
    loading: "Загрузка...",
    networkError: "Ошибка сети. Попробуйте снова.",
    genericError: "Произошла ошибка",
  },
} as const satisfies Record<Lang, Record<string, string>>;
