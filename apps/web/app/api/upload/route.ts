import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAccessToken } from '@bloghub/api';
import { getAuthPayload } from '@bloghub/api';
import { isR2Configured, uploadToR2 } from '../../lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 5 MB — keep cover images reasonably small.
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Allowlist of folders the upload endpoint will write into. Prevents callers
// from injecting arbitrary key prefixes (e.g. `../`, system paths).
const ALLOWED_FOLDERS = new Set<string>(['covers', 'avatars']);

function getAuth(request: NextRequest) {
  // Prefer the Bearer header (mobile + most client fetches).
  const fromHeader = getAuthPayload(request);
  if (fromHeader) return fromHeader;
  // Fall back to the session cookie used by the Next.js middleware.
  const cookie = request.cookies.get('accessToken')?.value;
  if (!cookie) return null;
  return verifyAccessToken(cookie);
}

/**
 * POST /api/upload
 *
 * Accepts a single image file under the form field `file` and uploads it to
 * Cloudflare R2. Returns the public URL of the uploaded object.
 *
 * Requires authentication. The uploaded object key embeds the uploader's
 * user id so audits / cleanup remain straightforward.
 */
export async function POST(request: NextRequest) {
  const auth = getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          'File uploads are not configured on this server. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL in the environment.',
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart/form-data body' },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'Missing "file" field in form data' },
      { status: 400 },
    );
  }

  const contentType = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(contentType)) {
    return NextResponse.json(
      {
        error:
          'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF',
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `File too large. Maximum size is ${Math.round(
          MAX_SIZE_BYTES / 1024 / 1024,
        )} MB.`,
      },
      { status: 413 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: 'Empty file rejected' },
      { status: 400 },
    );
  }

  const folderRaw = formData.get('folder');
  const folder =
    typeof folderRaw === 'string' && ALLOWED_FOLDERS.has(folderRaw)
      ? folderRaw
      : 'covers';

  const ext = MIME_TO_EXT[contentType] ?? 'bin';
  const key = `${folder}/${auth.sub}/${randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  try {
    const { url } = await uploadToR2({
      key,
      body: new Uint8Array(arrayBuffer),
      contentType,
    });
    return NextResponse.json({ url, key }, { status: 201 });
  } catch (err) {
    console.error('R2 upload failed', err);
    return NextResponse.json(
      { error: 'Upload failed. Try again.' },
      { status: 502 },
    );
  }
}
