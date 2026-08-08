"use client";

import { useState, useEffect } from "react";

interface SiteContent {
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaPrimary?: string;
  heroCtaSecondary?: string;
  pricingAmount?: string;
  pricingPeriod?: string;
  pricingFeatures?: string[];
  contactWhatsapp?: string;
  contactEmail?: string;
  kaspiLink?: string;
  seoTitle?: string;
  seoDescription?: string;
  footerText?: string;
  announcementBar?: string;
  announcementEnabled?: boolean;
}

const DEFAULTS: SiteContent = {
  heroTitle: "Сіздің тойыңыз — премиум деңгейде.",
  heroSubtitle: "Цифрлы шақыру жасаңыз, RSVP жинаңыз, WhatsApp арқылы бөлісіңіз.",
  heroCtaPrimary: "✨ Шаблондарды қарау",
  heroCtaSecondary: "Тегін тіркелу",
  pricingAmount: "4 990",
  pricingPeriod: "90 күн белсенді",
  pricingFeatures: [
    "Кез-келген шаблонды таңдаңыз",
    "Шексіз RSVP жинау",
    "Бөлісу сілтемесі",
    "Визуалды редактор",
    "WhatsApp интеграциясы",
    "Картадан орынды қосу",
  ],
  contactWhatsapp: "",
  contactEmail: "",
  kaspiLink: "",
  seoTitle: "Шақыру — Премиум цифрлы шақырулар",
  seoDescription: "Элегантты цифрлы шақырулар. Үйлену той, ұзату, туылған күн үшін.",
  footerText: "Қазақстандық премиум цифрлы шақыру сервисі",
  announcementBar: "",
  announcementEnabled: false,
};

export default function AdminSitePage() {
  const [content, setContent] = useState<SiteContent>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuresText, setFeaturesText] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data: SiteContent) => {
        const merged = { ...DEFAULTS, ...data };
        setContent(merged);
        setFeaturesText((merged.pricingFeatures ?? DEFAULTS.pricingFeatures ?? []).join("\n"));
        setLoading(false);
      })
      .catch(() => {
        setFeaturesText((DEFAULTS.pricingFeatures ?? []).join("\n"));
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const pricingFeatures = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...content, pricingFeatures }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const up = (patch: Partial<SiteContent>) => setContent((prev) => ({ ...prev, ...patch }));

  if (loading) return <div className="text-sm" style={{ color: "var(--muted)" }}>Жүктелуде...</div>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: "var(--charcoal)" }}>
            Сайт CMS
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Сайттың барлық мәтіндерін осы жерден басқарыңыз
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-gold px-6"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Сақталуда..." : saved ? "✓ Сақталды" : "Сақтау"}
        </button>
      </div>

      {/* Announcement */}
      <Card title="Хабарландыру жолағы">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={content.announcementEnabled ?? false}
            onChange={(e) => up({ announcementEnabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm" style={{ color: "var(--charcoal)" }}>Хабарландыруды қосу</span>
        </label>
        <TextArea label="Хабарландыру мәтіні" value={content.announcementBar ?? ""} onChange={(v) => up({ announcementBar: v })} rows={2} placeholder="🎉 Жаңа жаңарту: AI мәтін генераторы қосылды!" />
      </Card>

      {/* Hero */}
      <Card title="Hero бөлімі">
        <TextField label="Бас тақырып" value={content.heroTitle ?? ""} onChange={(v) => up({ heroTitle: v })} placeholder="Сіздің тойыңыз — премиум деңгейде." />
        <TextArea label="Сипаттама" value={content.heroSubtitle ?? ""} onChange={(v) => up({ heroSubtitle: v })} rows={3} placeholder="Цифрлы шақыру жасаңыз..." />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Негізгі батырма" value={content.heroCtaPrimary ?? ""} onChange={(v) => up({ heroCtaPrimary: v })} placeholder="✨ Шаблондарды қарау" />
          <TextField label="Екінші батырма" value={content.heroCtaSecondary ?? ""} onChange={(v) => up({ heroCtaSecondary: v })} placeholder="Тегін тіркелу" />
        </div>
      </Card>

      {/* Pricing */}
      <Card title="Баға бөлімі">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Сома (₸)" value={content.pricingAmount ?? ""} onChange={(v) => up({ pricingAmount: v })} placeholder="4 990" />
          <TextField label="Мерзім" value={content.pricingPeriod ?? ""} onChange={(v) => up({ pricingPeriod: v })} placeholder="90 күн белсенді" />
        </div>
        <TextArea
          label="Тарифтің мүмкіндіктері (жол-жол)"
          value={featuresText}
          onChange={setFeaturesText}
          rows={7}
          placeholder={"Кез-келген шаблонды таңдаңыз\nШексіз RSVP жинау\nБөлісу сілтемесі"}
        />
      </Card>

      {/* Contact */}
      <Card title="Байланыс">
        <TextField label="WhatsApp нөмірі" value={content.contactWhatsapp ?? ""} onChange={(v) => up({ contactWhatsapp: v })} placeholder="+7 700 000 0000" />
        <TextField label="Email" value={content.contactEmail ?? ""} onChange={(v) => up({ contactEmail: v })} placeholder="hello@shakiru.kz" />
        <TextField label="Kaspi төлем сілтемесі" value={content.kaspiLink ?? ""} onChange={(v) => up({ kaspiLink: v })} placeholder="https://kaspi.kz/pay/..." />
      </Card>

      {/* SEO */}
      <Card title="SEO">
        <TextField label="SEO тақырып" value={content.seoTitle ?? ""} onChange={(v) => up({ seoTitle: v })} placeholder="Шақыру — Премиум цифрлы шақырулар" />
        <TextArea label="SEO сипаттамасы" value={content.seoDescription ?? ""} onChange={(v) => up({ seoDescription: v })} rows={3} placeholder="Элегантты цифрлы шақырулар..." />
      </Card>

      {/* Footer */}
      <Card title="Footer">
        <TextField label="Footer мәтіні" value={content.footerText ?? ""} onChange={(v) => up({ footerText: v })} placeholder="Қазақстандық премиум цифрлы шақыру сервисі" />
      </Card>

      <div className="pb-8 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="btn-gold px-8"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Сақталуда..." : saved ? "✓ Сақталды" : "Барлығын сақтау"}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "white", border: "1px solid var(--border)" }}>
      <p className="label-caps" style={{ color: "var(--gold)" }}>{title}</p>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <input
        type="text"
        className="input-premium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <textarea
        className="input-premium resize-none"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
