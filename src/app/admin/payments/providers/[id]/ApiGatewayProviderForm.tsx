"use client";

import { useState, useTransition } from "react";
import { saveApiGatewayProviderAction, testProviderConfigAction } from "./actions";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { ProviderEntry, ApiGatewayConfig, ProviderId } from "@/lib/payment-providers";

interface Props {
  id: Exclude<ProviderId, "KASPI_LINK">;
  provider: ProviderEntry<ApiGatewayConfig>;
  webhookUrl: string;
}

export function ApiGatewayProviderForm({ id, provider, webhookUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTest] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [enabled, setEnabled] = useState(provider.enabled);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveApiGatewayProviderAction(id, fd);
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  };

  const handleTest = () => {
    setTestResult(null);
    startTest(async () => {
      const result = await testProviderConfigAction(id);
      setTestResult(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-800">Провайдерді қосу</p>
          <p className="text-xs text-zinc-400">Өшірулі болса, пайдаланушыларға көрсетілмейді</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--charcoal)" }}>
          Режим
        </label>
        <select name="mode" defaultValue={provider.mode} className="input-premium">
          <option value="TEST">TEST</option>
          <option value="LIVE">LIVE</option>
        </select>
      </div>

      <Input
        label="Merchant ID"
        name="merchantId"
        defaultValue={provider.config.merchantId}
        placeholder="Merchant ID"
      />

      <Input
        label="Secret Key"
        type="password"
        name="secretKey"
        defaultValue={provider.config.secretKey}
        placeholder="••••••••••••"
        hint={provider.config.secretKey ? "Өзгертпесеңіз, бұрынғы мән сақталады" : undefined}
      />

      <Input
        label="Webhook Secret"
        type="password"
        name="webhookSecret"
        defaultValue={provider.config.webhookSecret}
        placeholder="••••••••••••"
        hint={provider.config.webhookSecret ? "Өзгертпесеңіз, бұрынғы мән сақталады" : undefined}
      />

      <Input label="Webhook URL" value={webhookUrl} disabled hint="Осы сілтемені провайдердің кабинетіне қойыңыз" />

      <Textarea
        label="Нұсқаулық (қазақша)"
        name="instructionsKk"
        defaultValue={provider.config.instructionsKk}
        rows={3}
        hint="Клиентке көрсетілетін төлем нұсқаулығы"
      />

      <Textarea
        label="Инструкция (русский)"
        name="instructionsRu"
        defaultValue={provider.config.instructionsRu}
        rows={3}
      />

      <Input label="Растау режимі" value="MANUAL_APPROVAL" disabled />

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700">
          ✓ Сақталды
        </p>
      )}
      {testResult && (
        <p
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            testResult.ok ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700"
          }`}
        >
          {testResult.ok ? "✓ " : "⚠ "}
          {testResult.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" loading={isTesting} onClick={handleTest} className="flex-1">
          Баптауды тексеру
        </Button>
        <Button type="submit" loading={isPending} className="flex-1">
          Сақтау
        </Button>
      </div>
    </form>
  );
}
