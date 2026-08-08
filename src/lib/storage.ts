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

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

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

/**
 * Copies an object to a new key and deletes the original. Used to move
 * anonymous temp uploads (temp/<draftToken>/...) into an invite's own
 * namespace once the invite is claimed by an authenticated user.
 */
export async function moveFile(fromKey: string, toKey: string): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("Storage is not configured.");
  }
  const cfg = getStorageConfig();
  const client = getClient();
  await client.send(
    new CopyObjectCommand({
      Bucket: cfg.bucket,
      CopySource: `/${cfg.bucket}/${fromKey}`,
      Key: toKey,
    })
  );
  await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: fromKey }));
  return getPublicUrl(toKey);
}

export async function statFile(key: string): Promise<{ size: number; contentType?: string } | null> {
  if (!isStorageConfigured()) return null;
  try {
    const cfg = getStorageConfig();
    const res = await getClient().send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch {
    return null;
  }
}

export interface StoredObject {
  key: string;
  lastModified: Date | null;
  size: number;
}

/**
 * Lists every object under `prefix` (paginated internally). Used by the
 * anonymous-upload cleanup job to scan temp/ — never call this with an
 * empty/unbounded prefix in that context, since it would enumerate the
 * whole bucket including invites/* permanent media.
 */
export async function listObjectsUnderPrefix(prefix: string): Promise<StoredObject[]> {
  if (!isStorageConfigured()) return [];
  const cfg = getStorageConfig();
  const client = getClient();
  const results: StoredObject[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      results.push({ key: obj.Key, lastModified: obj.LastModified ?? null, size: obj.Size ?? 0 });
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return results;
}

/** Build a public URL for files in a publicly-readable bucket. */
export function getPublicUrl(key: string): string {
  const { endpoint, bucket, publicUrl } = getStorageConfig();
  const base = publicUrl || endpoint;
  if (!base) throw new Error("S3_ENDPOINT is not set");
  return `${base.replace(/\/$/, "")}/${bucket}/${key}`;
}

/** Inverse of getPublicUrl: extracts the object key, or null if the URL isn't ours. */
export function extractKeyFromPublicUrl(url: string): string | null {
  try {
    const prefix = getPublicUrl("");
    if (!url.startsWith(prefix)) return null;
    return url.slice(prefix.length);
  } catch {
    return null;
  }
}
