import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Кіру — Шақыру",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-rose-500 tracking-tight">
            Шақыру
          </Link>
          <p className="mt-1 text-sm text-zinc-500">Жүйеге кіріңіз</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <LoginForm />

          <div className="mt-5 text-center">
            <p className="text-sm text-zinc-500">
              Тіркелмегенсіз бе?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-rose-500 hover:text-rose-600 transition-colors"
              >
                Тіркелу
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
