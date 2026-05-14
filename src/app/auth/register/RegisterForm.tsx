"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  name: z.string().min(1, "Атыңызды енгізіңіз").max(100),
  email: z.string().email("Жарамды email енгізіңіз"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "Пароль кем дегенде 8 таңбадан тұруы керек"),
});
type FormData = z.infer<typeof schema>;

interface Props {
  from?: string;
}

export function RegisterForm({ from }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerAction(data, from);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Аты-жөні"
        placeholder="Айдар Сейітов"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        type="tel"
        label="Телефон (міндетті емес)"
        placeholder="+7 701 000 00 00"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Input
        type="password"
        label="Пароль"
        placeholder="Кем дегенде 8 таңба"
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
        Тіркелу
      </Button>
    </form>
  );
}
