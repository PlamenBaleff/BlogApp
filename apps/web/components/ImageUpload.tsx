'use client';

/**
 * Cover-image picker for the post create/edit forms.
 *
 * Responsibilities:
 *   - Render a file input and a live preview when an image is selected.
 *   - On selection, immediately upload the image to /api/upload and lift the
 *     returned public URL to the parent via `onChange`.
 *   - Provide a "Remove" button that clears the URL locally. (The actual R2
 *     object is deleted server-side when the post is saved with a different
 *     cover or when the post itself is deleted.)
 *
 * The component is intentionally URL-driven: the parent owns the canonical
 * `value` (the public R2 URL or null) and feeds it back here. That makes the
 * edit form trivial — pass in the post's existing `coverImageUrl` and the
 * preview Just Works.
 */

import { useRef, useState } from 'react';
import { authHeader } from '../app/lib/session';

export interface ImageUploadProps {
  /** Current cover image URL (null when none). */
  value: string | null;
  /** Called with the new URL or null when cleared. */
  onChange: (url: string | null) => void;
  /** Optional label override. */
  label?: string;
  /** Disable the controls (e.g. while the parent form is submitting). */
  disabled?: boolean;
  /**
   * Visual variant.
   *   - `cover`  : wide 16:9 preview (default, used for post cover images).
   *   - `avatar` : square circular preview, suitable for profile pictures.
   */
  variant?: 'cover' | 'avatar';
  /**
   * R2 folder to store the upload under. Must match the server-side allowlist
   * in `/api/upload`. Defaults to `covers` for backwards compatibility.
   */
  folder?: 'covers' | 'avatars';
  /** Hint text shown under the control. */
  hint?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function ImageUpload({
  value,
  onChange,
  label = 'Cover image',
  disabled,
  variant = 'cover',
  folder = 'covers',
  hint,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image is larger than 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
        // authHeader() reads the Bearer token from localStorage; the cookie
        // is also sent automatically, so the endpoint accepts either.
        headers: { ...authHeader() },
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        setError(json.error ?? `Upload failed (HTTP ${res.status})`);
        return;
      }
      onChange(json.url);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset the input so the same file can be picked again after a remove.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const isAvatar = variant === 'avatar';
  const previewClass = isAvatar
    ? 'relative w-32 h-32 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
    : 'relative w-full max-w-md aspect-[16/9] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900';
  const emptyClass = isAvatar
    ? 'w-32 h-32 flex items-center justify-center text-center text-xs px-2 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-50'
    : 'w-full max-w-md flex items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-50';
  const emptyLabel = isAvatar
    ? uploading
      ? 'Uploading…'
      : 'Upload photo'
    : uploading
      ? 'Uploading…'
      : 'Click to upload an image (JPG, PNG, WebP, GIF — up to 5 MB)';
  const previewAlt = isAvatar ? 'Avatar preview' : 'Cover preview';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
        {label}
      </label>

      {value ? (
        <div className="space-y-2">
          <div className={previewClass}>
            {/* Plain <img> so we don't have to thread next/image config */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={previewAlt}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={emptyClass}
        >
          {emptyLabel}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
