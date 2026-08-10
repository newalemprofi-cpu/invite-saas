/**
 * Turns a customer-entered YouTube URL into a safe embed URL, or null if it
 * isn't a recognized YouTube link. Never passes arbitrary input through to
 * an iframe src — the only possible outputs are `null` or a
 * `https://www.youtube.com/embed/<id>` URL built from a validated video ID,
 * so this also doubles as the allowlist against arbitrary iframe domains.
 */

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);

// Real YouTube video IDs are 11 base64url-ish characters. Rejecting anything
// else means a malformed/truncated/garbage id can never reach the iframe.
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function getYoutubeEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    id = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    id = url.searchParams.get("v");
  } else if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") {
    id = segments[1] ?? null;
  }

  if (!id || !VIDEO_ID_RE.test(id)) return null;
  return `https://www.youtube.com/embed/${id}`;
}
