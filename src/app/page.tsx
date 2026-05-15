import type { Metadata } from "next";
import Link from "next/link";
import { getProductSettings } from "@/lib/product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Шақыру — Онлайн шақыру конструкторы",
  description:
    "Қазақстан нарығына арналған premium онлайн шақырулар. Той, туылған күн, корпоратив — кез-келген іс-шараға.",
};

const features = [
  { emoji: "🎨", title: "7 Premium тема", desc: "Rose Gold, Midnight, Kazakh Heritage, Ұзату, Балалар тойы және тағы басқалары" },
  { emoji: "📱", title: "Мобильді-бірінші", desc: "Барлық телефон мен планшетте керемет көрінеді" },
  { emoji: "✅", title: "RSVP жинау", desc: "Қонақтар браузер арқылы жауап береді. Барлық жауаптар дашбордта" },
  { emoji: "🔗", title: "Бөлісу оңай", desc: "WhatsApp, Instagram, Telegram арқылы бір сілтемемен бөлісіңіз" },
  { emoji: "⚡", title: "5 минутта дайын", desc: "4 қадамнан тұратын конструктор арқылы жылдам жасаңыз" },
  { emoji: "💳", title: "Kaspi арқылы төлеу", desc: "Қазақстанның ең танымал төлем жүйесімен ыңғайлы төлем" },
];

const steps = [
  { n: "01", title: "Жасаңыз", desc: "Тема мен іс-шараны таңдаңыз, барлық мәліметтерді толтырыңыз" },
  { n: "02", title: "Төлеңіз", desc: "Kaspi арқылы төлем жасаңыз. Admin 1-24 сағатта растайды" },
  { n: "03", title: "Бөлісіңіз", desc: "Сілтемені WhatsApp немесе Instagram-ға жіберіп, RSVP жинаңыз" },
];

export default async function LandingPage() {
  const product = await getProductSettings();
  const priceDisplay = product.price.toLocaleString("kk-KZ");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-rose-500 text-xl tracking-tight">Шақыру</span>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Кіру
            </Link>
            <Link href="/auth/register" className="inline-flex h-9 items-center rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-600 transition-colors">
              Тіркелу
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50 pt-20 pb-24 px-4">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-100 opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-pink-100 opacity-40 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
            🇰🇿 Қазақстан нарығына арналған
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight tracking-tight">
            Той шақыруы —{" "}
            <span className="text-rose-500">онлайн.</span>
            <br />
            Сұлу. Жылдам. Оңай.
          </h1>
          <p className="text-lg text-zinc-500 max-w-xl leading-relaxed">
            Той, туылған күн, ұзату, корпоратив — кез-келген іс-шараға premium
            цифрлық шақыру жасаңыз. Kaspi арқылы төлеп, бірден бөлісіңіз.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Link
              href="/create"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-500 px-8 text-base font-semibold text-white shadow-md shadow-rose-200 hover:bg-rose-600 transition-all hover:scale-[1.02] active:scale-100"
            >
              ✨ Шақыру жасау
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-8 text-base font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Кіру →
            </Link>
          </div>
          <p className="text-xs text-zinc-400">
            Тіркелу — тегін · Тек жарияланған шақыру үшін ғана төлем
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">Қалай жұмыс істейді?</h2>
            <p className="text-zinc-500 mt-2">3 қадам — дайын</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="flex flex-col items-center text-center gap-3 relative">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+28px)] right-0 h-px bg-zinc-100" />
                )}
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-rose-400">{s.n}</span>
                </div>
                <h3 className="font-bold text-zinc-900">{s.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-zinc-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">Неге Шақыру?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-3">
                <span className="text-3xl leading-none">{f.emoji}</span>
                <h3 className="font-bold text-zinc-900">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — single product */}
      <section className="py-20 px-4 bg-white" id="pricing">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">Баға</h2>
            <p className="text-zinc-500 mt-2">Тіркелу тегін · Жариялаған кезде ғана төлем</p>
          </div>
          <div className="relative rounded-2xl border-2 border-rose-400 bg-rose-50 shadow-md p-8 flex flex-col gap-6 text-center">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-0.5 text-sm font-bold text-white whitespace-nowrap">
              Жариялау үшін
            </span>
            <div>
              <p className="text-4xl font-black text-zinc-900">
                {priceDisplay}
                <span className="text-xl font-semibold text-zinc-400"> ₸</span>
              </p>
              <p className="text-sm text-zinc-500 mt-1">{product.activeDays} күн белсенді</p>
            </div>
            <ul className="flex flex-col gap-2 text-left">
              {[
                "Кез-келген іс-шара түрі",
                "7 premium тема",
                "RSVP жинау",
                "Бөлісу сілтемесі",
                "Қонақтар тізімі",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-rose-500 text-base font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              Бастау →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-rose-500 to-pink-600">
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Бүгін алғашқы шақыруыңызды жасаңыз
          </h2>
          <p className="text-rose-100 leading-relaxed max-w-md">
            Тіркелу тегін. Тек шақыруыңызды жариялаған кезде ғана төлем
            жасайсыз. Жоба ретінде сақтап, кейін жариялай аласыз.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-8 text-base font-bold text-rose-500 shadow-md hover:bg-rose-50 transition-colors"
          >
            Тегін тіркелу →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-rose-400 text-lg">Шақыру</span>
          <p className="text-sm text-zinc-500 text-center">Қазақстандық онлайн шақыру сервисі</p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/auth/login" className="hover:text-zinc-300 transition-colors">Кіру</Link>
            <Link href="/auth/register" className="hover:text-zinc-300 transition-colors">Тіркелу</Link>
            <Link href="/create" className="hover:text-zinc-300 transition-colors">Жасау</Link>
            <Link href="#pricing" className="hover:text-zinc-300 transition-colors">Баға</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
