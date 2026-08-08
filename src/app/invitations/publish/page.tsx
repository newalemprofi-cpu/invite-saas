import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveLang } from "@/lib/i18n";
import { ClaimDraftClient } from "./ClaimDraftClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ lang?: string }>;
}

/**
 * The "publish" step of the anonymous constructor. Anonymous visitors are
 * bounced through register/login (preserving this exact URL as `from`, so
 * they land right back here); the draft itself survives via localStorage,
 * not the URL. Already-authenticated users skip straight to claiming —
 * no visible auth step, matching "no unnecessary auth redirect".
 */
export default async function PublishPage({ searchParams }: Props) {
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);

  const session = await getSession();
  if (!session) {
    const returnTo = `/invitations/publish?lang=${lang}`;
    redirect(`/auth/register?from=${encodeURIComponent(returnTo)}&lang=${lang}`);
  }

  return <ClaimDraftClient lang={lang} />;
}
