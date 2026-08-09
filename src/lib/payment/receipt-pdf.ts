/**
 * The real extractor service only parses PDF (confirmed by live testing —
 * see receipt-extractor.ts's doc comment). Customers upload JPG/PNG phone
 * screenshots almost exclusively, so this wraps an image into a minimal
 * one-page PDF that the extractor can actually read, without changing what
 * the customer sees (the original image stays the "preview" file — see
 * PaymentReceipt.mediaKey vs .extractionMediaKey).
 */
import { PDFDocument } from "pdf-lib";

export type ConvertibleImageMime = "image/jpeg" | "image/png";

export function isConvertibleImage(mime: string): mime is ConvertibleImageMime {
  return mime === "image/jpeg" || mime === "image/png";
}

export async function wrapImageAsPdf(bytes: Buffer, mime: ConvertibleImageMime): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const image = mime === "image/jpeg" ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  const page = doc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
