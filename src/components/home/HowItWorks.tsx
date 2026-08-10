import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
}

const T = {
  kk: {
    title: "Қалай жұмыс істейді?",
    steps: [
      { n: "1", title: "Үлгіні таңдаңыз", desc: "Дайын дизайндардың ішінен ұнағанын таңдаңыз." },
      { n: "2", title: "Ақпаратты енгізіңіз", desc: "Аты-жөні, күні, мекенжайы және қажетті мәліметтерді толтырыңыз." },
      { n: "3", title: "Шақыруды жіберіңіз", desc: "Дайын сілтемені қонақтарыңызға жіберіңіз." },
    ],
  },
  ru: {
    title: "Как это работает?",
    steps: [
      { n: "1", title: "Выберите шаблон", desc: "Выберите подходящий дизайн." },
      { n: "2", title: "Заполните данные", desc: "Укажите имена, дату, место и другую информацию." },
      { n: "3", title: "Отправьте приглашение", desc: "Поделитесь готовой ссылкой с гостями." },
    ],
  },
} as const;

export function HowItWorks({ lang }: Props) {
  const t = T[lang];
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <h2 className="heading-display text-3xl sm:text-4xl text-center mb-12" style={{ color: "var(--charcoal)" }}>
        {t.title}
      </h2>
      <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
        {t.steps.map((s) => (
          <div key={s.n} className="flex flex-col items-center text-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-xl font-semibold"
              style={{ background: "rgba(196,150,62,0.12)", color: "var(--gold-dark)", border: "1px solid rgba(196,150,62,0.25)" }}
            >
              {s.n}
            </div>
            <h3 className="font-semibold text-base" style={{ color: "var(--charcoal)" }}>{s.title}</h3>
            <p className="text-sm max-w-[240px]" style={{ color: "var(--muted)" }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
