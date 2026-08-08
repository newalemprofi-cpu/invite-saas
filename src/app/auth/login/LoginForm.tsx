"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Lang } from "@/lib/i18n";

const MESSAGES = {
  kk: { email: "Жарамды email енгізіңіз", password: "Парольді енгізіңіз" },
  ru: { email: "Введите корректный email", password: "Введите пароль" },
} as const;

const LABELS = {
  kk: { email: "Email", password: "Пароль", submit: "Кіру" },
  ru: { email: "Email", password: "Пароль", submit: "Войти" },
} as const;

interface Props {
  from?: string;
  lang: Lang;
}

export function LoginForm({ from, lang }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const m = MESSAGES[lang];
  const L = LABELS[lang];

  const schema = z.object({
    email: z.string().email(m.email),
    password: z.string().min(1, m.password),
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
      const result = await loginAction(data, from, lang);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        type="email"
        label={L.email}
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        type="password"
        label={L.password}
        placeholder="••••••••"
        autoComplete="current-password"
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
