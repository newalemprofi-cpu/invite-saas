/**
 * Storage abstraction for MinIO / S3-compatible object storage.
 *
 * Required environment variables:
 *   S3_ENDPOINT    MinIO or S3 endpoint, e.g. https://minio.example.com
 *   S3_BUCKET      Bucket name, default: invitesaas
 *   S3_ACCESS_KEY  Access key ID
 *   S3_SECRET_KEY  Secret access key
 *   S3_REGION      Region string, default: us-east-1
 *
 * To activate:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *   Then implement uploadFile() and getSignedUrl() below.
 */

export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array;
}

export interface SignedUrlParams {
  key: string;
  expiresIn?: number; // seconds, default 3600
}

export function getStorageConfig() {
  return {
    endpoint: process.env.S3_ENDPOINT ?? "",
    bucket: process.env.S3_BUCKET ?? "invitesaas",
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "",
    secretKey: process.env.S3_SECRET_KEY ?? "",
  };
}

export function isStorageConfigured(): boolean {
  const cfg = getStorageConfig();
  return Boolean(cfg.endpoint && cfg.accessKey && cfg.secretKey);
}

/**
 * Upload a file to S3/MinIO.
 * TODO: install @aws-sdk/client-s3 and implement.
 */
export async function uploadFile(params: UploadParams): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY in .env"
    );
  }
  void params; // TODO: implement with @aws-sdk/client-s3
  // const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  // const cfg = getStorageConfig();
  // const client = new S3Client({ endpoint: cfg.endpoint, region: cfg.region,
  //   credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
  //   forcePathStyle: true });
  // await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: params.key,
  //   Body: params.body, ContentType: params.contentType }));
  // return getPublicUrl(params.key);
  throw new Error("uploadFile: @aws-sdk/client-s3 not yet installed");
}

/**
 * Generate a pre-signed URL for private file access (15 min default).
 * TODO: install @aws-sdk/s3-request-presigner and implement.
 */
export async function getSignedUrl(params: SignedUrlParams): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("Storage is not configured.");
  }
  void params; // TODO: implement with @aws-sdk/s3-request-presigner
  throw new Error(
    "getSignedUrl: @aws-sdk/s3-request-presigner not yet installed"
  );
}

/** Build a public URL for files in a publicly-readable bucket. */
export function getPublicUrl(key: string): string {
  const { endpoint, bucket } = getStorageConfig();
  if (!endpoint) throw new Error("S3_ENDPOINT is not set");
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
}
