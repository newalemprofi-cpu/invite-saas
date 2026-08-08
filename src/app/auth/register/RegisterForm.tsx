"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Lang } from "@/lib/i18n";

const MESSAGES = {
  kk: {
    name: "Атыңызды енгізіңіз",
    email: "Жарамды email енгізіңіз",
    passwordMin: "Пароль кем дегенде 8 таңбадан тұруы керек",
  },
  ru: {
    name: "Введите ваше имя",
    email: "Введите корректный email",
    passwordMin: "Пароль должен содержать минимум 8 символов",
  },
} as const;

const LABELS = {
  kk: {
    name: "Аты-жөні", namePlaceholder: "Айдар Сейітов",
    email: "Email",
    phone: "Телефон (міндетті емес)", phonePlaceholder: "+7 701 000 00 00",
    password: "Пароль", passwordPlaceholder: "Кем дегенде 8 таңба",
    submit: "Тіркелу",
  },
  ru: {
    name: "Имя и фамилия", namePlaceholder: "Айдар Сейитов",
    email: "Email",
    phone: "Телефон (необязательно)", phonePlaceholder: "+7 701 000 00 00",
    password: "Пароль", passwordPlaceholder: "Минимум 8 символов",
    submit: "Зарегистрироваться",
  },
} as const;

interface Props {
  from?: string;
  lang: Lang;
}

export function RegisterForm({ from, lang }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const m = MESSAGES[lang];
  const L = LABELS[lang];

  const schema = z.object({
    name: z.string().min(1, m.name).max(100),
    email: z.string().email(m.email),
    phone: z.string().optional(),
    password: z.string().min(8, m.passwordMin),
  });
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerAction(data, from, lang);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={L.name}
        placeholder={L.namePlaceholder}
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        type="email"
        label={L.email}
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        type="tel"
        label={L.phone}
        placeholder={L.phonePlaceholder}
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Input
        type="password"
        label={L.password}
        placeholder={L.passwordPlaceholder}
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      {serverError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </p>
      )}
      <Button type="submit" loading={isPending} size="lg" className="w-full mt-1">
        {L.submit}
      </Button>
    </form>
  );
}
