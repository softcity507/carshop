const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isCloudinaryConfigured() {
  return Boolean(CLOUD && PRESET);
}

/**
 * Unsigned browser upload straight to Cloudinary — the file never passes through our server.
 * Returns the `secure_url` to persist on the product document.
 */
export async function uploadToCloudinary(file: File, signal?: AbortSignal): Promise<string> {
  if (!CLOUD || !PRESET) {
    throw new Error('Missing Cloudinary config. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image.`);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`);
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', PRESET);
  if (FOLDER) fd.append('folder', FOLDER);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
    signal,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    // Surface Cloudinary's own message — e.g. "Invalid upload preset".
    throw new Error(json?.error?.message || `Cloudinary upload failed (status ${res.status})`);
  }

  if (!json?.secure_url) throw new Error('Cloudinary did not return secure_url');
  return json.secure_url as string;
}

/** Uploads in parallel and reports progress as each file lands. */
export async function uploadManyToCloudinary(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  let done = 0;
  return Promise.all(
    files.map(async (file) => {
      const url = await uploadToCloudinary(file);
      done += 1;
      onProgress?.(done, files.length);
      return url;
    })
  );
}

/** Inserts Cloudinary transformation params so cards don't download full-size originals. */
export function cloudinaryThumb(url: string, width = 600) {
  if (!url.includes('/image/upload/')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
}
