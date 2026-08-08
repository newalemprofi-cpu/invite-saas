/**
 * Storage abstraction for MinIO / S3-compatible object storage.
 *
 * Required environment variables:
 *   S3_ENDPOINT    MinIO or S3 endpoint, e.g. https://minio.example.com
 *   S3_BUCKET      Bucket name, default: invitesaas
 *   S3_ACCESS_KEY  Access key ID
 *   S3_SECRET_KEY  Secret access key
 *   S3_REGION      Region string, default: us-east-1
 *   S3_PUBLIC_URL  Optional public base URL if different from S3_ENDPOINT
 *                  (e.g. a CDN domain in front of the bucket)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array;
}

export function getStorageConfig() {
  return {
    endpoint: process.env.S3_ENDPOINT ?? "",
    bucket: process.env.S3_BUCKET ?? "invitesaas",
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "",
    secretKey: process.env.S3_SECRET_KEY ?? "",
    publicUrl: process.env.S3_PUBLIC_URL ?? "",
  };
}

export function isStorageConfigured(): boolean {
  const cfg = getStorageConfig();
  return Boolean(cfg.endpoint && cfg.accessKey && cfg.secretKey);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (client) return client;
  const cfg = getStorageConfig();
  client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    forcePathStyle: true,
  });
  return client;
}

/** Upload a file to S3/MinIO and return its public URL. */
export async function uploadFile(params: UploadParams): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY in .env"
    );
  }
  const cfg = getStorageConfig();
  await getClient().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
  return getPublicUrl(params.key);
}

export async function deleteFile(key: string): Promise<void> {
  if (!isStorageConfigured()) return;
  const cfg = getStorageConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

/** Build a public URL for files in a publicly-readable bucket. */
export function getPublicUrl(key: string): string {
  const { endpoint, bucket, publicUrl } = getStorageConfig();
  const base = publicUrl || endpoint;
  if (!base) throw new Error("S3_ENDPOINT is not set");
  return `${base.replace(/\/$/, "")}/${bucket}/${key}`;
}
