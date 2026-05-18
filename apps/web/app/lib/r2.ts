/**
 * Cloudflare R2 client.
 *
 * R2 exposes an S3-compatible API, so we talk to it through `@aws-sdk/client-s3`
 * pointed at the R2 endpoint. Credentials come from environment variables.
 *
 * Required env vars (set in `.env.local` / Vercel / Netlify):
 *   R2_ENDPOINT          e.g. https://<account-id>.r2.cloudflarestorage.com
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET            e.g. bloghub-uploads
 *   R2_PUBLIC_BASE_URL   public hostname mapped to the bucket
 *                        (e.g. https://cdn.example.com or the bucket public URL)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `R2 uploads are not configured.`,
    );
  }
  return value;
}

/** Returns true when the minimum R2 config is present. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

let cached: S3Client | null = null;

function getClient(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    // R2 ignores region but the SDK requires one to be set.
    region: 'auto',
    endpoint: readEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: readEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: readEnv('R2_SECRET_ACCESS_KEY'),
    },
    // Required for R2 (no virtual-hosted-style buckets).
    forcePathStyle: true,
  });
  return cached;
}

/** Uploads a binary blob to R2 and returns the public URL + storage key. */
export async function uploadToR2(params: {
  key: string;
  body: Uint8Array | Buffer;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const bucket = readEnv('R2_BUCKET');
  const publicBase = readEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      // Allow long-lived caching since uploaded objects are immutable
      // (we use unique keys per upload).
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return {
    key: params.key,
    url: `${publicBase}/${params.key}`,
  };
}

/** Deletes an object from R2. Silently returns if the URL is not ours. */
export async function deleteFromR2ByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (!isR2Configured()) return;

  const publicBase = readEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  if (!url.startsWith(publicBase + '/')) return;

  const key = url.slice(publicBase.length + 1);
  if (!key) return;

  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: readEnv('R2_BUCKET'),
        Key: key,
      }),
    );
  } catch (err) {
    // Don't fail the parent operation (e.g. post delete) just because the
    // image could not be removed. Log it for ops.
    console.error('Failed to delete R2 object', { url, err });
  }
}
