import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Тіркелу — Шақыру",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-rose-500 tracking-tight">
            Шақыру
          </Link>
          <p className="mt-1 text-sm text-zinc-500">Тегін тіркеліңіз</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <RegisterForm />

          <div className="mt-5 text-center">
            <p className="text-sm text-zinc-500">
              Тіркелгенсіз бе?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-rose-500 hover:text-rose-600 transition-colors"
              >
                Кіру
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
