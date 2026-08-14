import {
  type DecorationInstance,
  DECORATION_PLACEMENT_CLASS,
  DECORATION_SIZE_PX,
} from "@/lib/visual-config";

/**
 * Renders a section's asset-based decoration instances (§12 of the Full
 * Production Template Designer task) — admin-uploaded transparent PNG/
 * WEBP images placed at one of a closed set of preset positions, never
 * arbitrary x/y (§25). `assetUrls` is a plain client-safe map (assetId →
 * resolved image URL) threaded in by the caller — this component itself
 * never touches the database (see InvitationView.tsx's `assetUrls` prop
 * doc for why: it must stay renderable inside the Admin Builder's Client
 * Component preview, which has no server-only Prisma access). An
 * `assetId` that isn't in the map (asset deleted, or the Builder hasn't
 * loaded it yet) is silently skipped — never a broken-image icon, never
 * a crash.
 */
export function AssetDecorationLayer({
  decorations, assetUrls, layer,
}: {
  decorations: DecorationInstance[];
  assetUrls: Record<string, string>;
  layer: "background" | "foreground";
}) {
  const items = decorations.filter((d) => (d.layer ?? "foreground") === layer);
  if (items.length === 0) return null;

  return (
    <>
      {items.map((d, i) => {
        const url = assetUrls[d.assetId];
        if (!url) return null;
        const isWatermark = d.placement === "watermark";
        const px = DECORATION_SIZE_PX[d.size ?? "md"];

        const transformParts: string[] = [];
        if (d.placement === "top-center" || d.placement === "bottom-center") transformParts.push("translateX(-50%)");
        if (d.placement === "center-left" || d.placement === "center-right") transformParts.push("translateY(-50%)");
        if (d.placement === "center") transformParts.push("translate(-50%,-50%)");
        if (d.rotation) transformParts.push(`rotate(${d.rotation}deg)`);
        if (d.flip) transformParts.push("scaleX(-1)");

        return (
          <div
            key={i}
            className={DECORATION_PLACEMENT_CLASS[d.placement]}
            style={{
              width: isWatermark ? "70%" : px,
              height: isWatermark ? "70%" : px,
              maxWidth: isWatermark ? 420 : undefined,
              maxHeight: isWatermark ? 420 : undefined,
              opacity: d.opacity ?? (isWatermark ? 0.06 : 0.85),
              transform: transformParts.length ? transformParts.join(" ") : undefined,
              pointerEvents: "none",
              zIndex: layer === "background" ? 0 : 5,
            }}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-contain" draggable={false} />
          </div>
        );
      })}
    </>
  );
}
