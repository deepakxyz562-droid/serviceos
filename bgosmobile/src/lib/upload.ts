import { Platform } from 'react-native';
import { API_BASE_URL } from './constants';
import { ApiError, refreshSession } from './api';
import { getToken, sessionRevision } from './auth';

export type PendingUpload = {
  uri: string;
  name: string;
  mimeType: string;
  file?: unknown;
  fileSize?: number;
  mediaType?: 'image' | 'video';
};

export interface UploadStorageOptions {
  folder?: string;
  visibility?: 'public' | 'private';
  retryAuth?: boolean;
  timeoutMs?: number;
  onProgress?: (percent: number) => void;
  onWarning?: (warning: string) => void;
}

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_DOC_BYTES = 25 * 1024 * 1024;

const EXT_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  pdf: 'application/pdf',
};

export function normalizePendingUpload(input: PendingUpload, index = 0): PendingUpload {
  const rawUri = input.uri || '';
  const cleanNameBase = (input.name || '').trim() || rawUri.split('/').pop()?.split('?')[0] || '';
  let mime = (input.mimeType || '').trim().toLowerCase();

  if (mime === 'image/jpg') mime = 'image/jpeg';
  if (mime === 'image') mime = 'image/jpeg';
  if (mime === 'video') mime = 'video/mp4';

  const extFromName = cleanNameBase.includes('.') ? cleanNameBase.split('.').pop()?.toLowerCase() || '' : '';
  const extFromUri = rawUri.includes('.') && !rawUri.startsWith('data:')
    ? rawUri.split('?')[0].split('.').pop()?.toLowerCase() || ''
    : '';
  const detectedExt = extFromName || extFromUri;

  if (!mime || mime === 'application/octet-stream') {
    if (detectedExt && EXT_MIME_MAP[detectedExt]) {
      mime = EXT_MIME_MAP[detectedExt];
    } else if (input.mediaType === 'video') {
      mime = 'video/mp4';
    } else {
      mime = 'image/jpeg';
    }
  }

  const defaultExt =
    mime === 'video/quicktime'
      ? 'mov'
      : mime === 'video/3gpp'
        ? '3gp'
        : mime === 'video/x-matroska'
          ? 'mkv'
          : mime === 'video/x-msvideo'
            ? 'avi'
            : mime === 'video/webm'
              ? 'webm'
              : mime === 'video/x-m4v'
                ? 'm4v'
                : mime.startsWith('video/')
                  ? 'mp4'
                  : mime === 'image/png'
                    ? 'png'
                    : mime === 'image/webp'
                      ? 'webp'
                      : 'jpg';

  const safeName = cleanNameBase
    ? cleanNameBase.includes('.')
      ? cleanNameBase
      : `${cleanNameBase}.${defaultExt}`
    : `${mime.startsWith('video/') ? 'video' : 'photo'}-${Date.now()}-${index}.${defaultExt}`;

  return {
    ...input,
    name: safeName,
    mimeType: mime,
    mediaType: mime.startsWith('video/') ? 'video' : 'image',
  };
}

/**
 * Native React Native upload via XMLHttpRequest.
 *
 * Expo SDK 57 replaces global `fetch()` with Winter `expo/fetch`, whose
 * `convertFormDataAsync()` throws `Unsupported FormDataPart implementation`
 * on RN `{ uri, name, type }` objects. XMLHttpRequest routes directly through
 * React Native's NetworkingModule, supporting native `file://` and `content://`
 * streaming multipart parts and accurate upload progress events without memory copies.
 */
function uploadNativeViaXhr(params: {
  url: string;
  token: string | null;
  file: PendingUpload;
  folder: string;
  visibility: 'public' | 'private';
  timeoutMs: number;
  onProgress?: (percent: number) => void;
}): Promise<{ status: number; bodyText: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', {
      uri: params.file.uri,
      name: params.file.name,
      type: params.file.mimeType || 'image/jpeg',
    } as any);
    form.append('folder', params.folder);
    form.append('visibility', params.visibility);

    xhr.open('POST', params.url);
    if (params.token) {
      xhr.setRequestHeader('Authorization', `Bearer ${params.token}`);
    }
    xhr.timeout = params.timeoutMs;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100)));
        params.onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      resolve({ status: xhr.status || 500, bodyText: xhr.responseText || '' });
    };

    xhr.onerror = () => {
      reject(new ApiError('Network error while uploading media. Check your connection and try again.', 0));
    };

    xhr.ontimeout = () => {
      reject(new ApiError('The upload timed out. Please try again on a stronger connection.', 408));
    };

    xhr.onabort = () => {
      reject(new ApiError('The upload was cancelled.', 499));
    };

    xhr.send(form);
  });
}

interface PresignResponse {
  success?: boolean;
  directUploadAvailable?: boolean;
  method?: string;
  uploadUrl?: string | null;
  headers?: Record<string, string>;
  publicUrl?: string | null;
  gbpVideoWarning?: string;
  error?: string;
}

function uploadBlobViaXhrPut(params: {
  url: string;
  headers?: Record<string, string>;
  blob: Blob;
  timeoutMs: number;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', params.url);
    if (params.headers) {
      for (const [k, v] of Object.entries(params.headers)) {
        if (v) xhr.setRequestHeader(k, v);
      }
    }
    xhr.timeout = params.timeoutMs;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(99, Math.max(5, Math.round((event.loaded / event.total) * 95) + 4));
        params.onProgress?.(pct);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Direct storage upload returned HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Direct storage network error'));
    xhr.ontimeout = () => reject(new Error('Direct storage upload timed out'));
    xhr.onabort = () => reject(new Error('Direct storage upload aborted'));
    xhr.send(params.blob);
  });
}

/**
 * Uploads a local device file (image, video, or PDF) to BGOS storage —
 * preferring direct presigned S3/R2 PUT (bypasses proxy body limits on large videos)
 * with transparent fallback to POST /api/omnichannel/upload.
 */
export async function uploadFileToStorage(
  fileInput: PendingUpload,
  options: UploadStorageOptions = {},
): Promise<string> {
  const file = normalizePendingUpload(fileInput);
  const {
    folder = 'gbp-media',
    visibility = 'public',
    retryAuth = true,
    timeoutMs = 120000,
    onProgress,
    onWarning,
  } = options;

  if (!file.uri && !file.file) {
    throw new ApiError('Selected file could not be read from device.', 400);
  }

  const resolvedSize =
    typeof file.fileSize === 'number' && file.fileSize > 0
      ? file.fileSize
      : file.file && typeof (file.file as Blob).size === 'number'
        ? (file.file as Blob).size
        : 0;
  const maxBytes = file.mediaType === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_DOC_BYTES;
  if (resolvedSize > maxBytes) {
    throw new ApiError(
      file.mediaType === 'video'
        ? 'Video exceeds the 100MB maximum upload limit.'
        : 'File exceeds the 25MB maximum upload limit.',
      400,
    );
  }

  const revision = sessionRevision();
  const token = await getToken();
  const uploadUrl = `${API_BASE_URL}/api/omnichannel/upload`;

  onProgress?.(2);

  // 1. Try direct presigned PUT upload first so large videos bypass proxy body limits
  try {
    const presignRes = await fetch(`${API_BASE_URL}/api/omnichannel/upload/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: resolvedSize,
        folder,
        visibility,
      }),
    });

    if (presignRes.status === 401 && retryAuth && revision === sessionRevision()) {
      const latest = await getToken();
      if (!latest || latest === token) {
        await refreshSession();
      }
      return uploadFileToStorage(file, { ...options, retryAuth: false });
    }

    const presign = (await presignRes.json().catch(() => ({}))) as PresignResponse;
    if (presignRes.status === 400 || presignRes.status === 413) {
      throw new ApiError(presign.error || 'Unsupported file or size limit exceeded.', presignRes.status, presign);
    }

    if (presign.gbpVideoWarning) {
      onWarning?.(presign.gbpVideoWarning);
    }

    if (presignRes.ok && presign.directUploadAvailable && presign.uploadUrl && presign.publicUrl) {
      try {
        let blob: Blob | null = null;
        if (file.file && typeof (file.file as Blob).arrayBuffer === 'function') {
          blob = file.file as Blob;
        } else if (file.uri) {
          const blobRes = await fetch(file.uri);
          blob = await blobRes.blob();
        }
        if (blob) {
          onProgress?.(5);
          await uploadBlobViaXhrPut({
            url: presign.uploadUrl,
            headers: presign.headers || { 'Content-Type': file.mimeType },
            blob,
            timeoutMs: Math.max(timeoutMs, file.mediaType === 'video' ? 180000 : timeoutMs),
            onProgress,
          });
          onProgress?.(100);
          return presign.publicUrl;
        }
      } catch (directErr) {
        console.warn('[uploadFileToStorage] Direct presigned PUT failed, falling back to multipart upload:', directErr);
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.warn('[uploadFileToStorage] Presign request unavailable, falling back to multipart upload:', err);
  }

  // 2. Fallback: authenticated multipart upload (POST /api/omnichannel/upload)
  if (Platform.OS !== 'web') {
    const result = await uploadNativeViaXhr({
      url: uploadUrl,
      token,
      file,
      folder,
      visibility,
      timeoutMs,
      onProgress,
    });

    if (result.status === 401 && retryAuth && revision === sessionRevision()) {
      const latest = await getToken();
      if (!latest || latest === token) {
        await refreshSession();
      }
      return uploadFileToStorage(file, { ...options, retryAuth: false });
    }

    let parsed: { url?: string; error?: string; message?: string } = {};
    try {
      parsed = result.bodyText ? JSON.parse(result.bodyText) : {};
    } catch {
      parsed = {};
    }

    if (result.status < 200 || result.status >= 300) {
      throw new ApiError(
        parsed.error || parsed.message || `Upload failed (${result.status}). Please try again.`,
        result.status,
        parsed,
      );
    }

    if (!parsed.url) {
      throw new ApiError('Upload did not return a file URL.', 502);
    }

    onProgress?.(100);
    return parsed.url;
  }

  // Web platform: use standard Blob / File FormData + fetch
  const form = new FormData();
  let webBlob: Blob | null = null;
  if (file.file && typeof (file.file as Blob).arrayBuffer === 'function') {
    webBlob = file.file as Blob;
  } else if (file.uri) {
    const blobRes = await fetch(file.uri);
    webBlob = await blobRes.blob();
  }
  if (!webBlob) {
    throw new ApiError('Could not read the selected file on this browser.', 400);
  }
  if (typeof File !== 'undefined' && !(webBlob instanceof File)) {
    const typedFile = new File([webBlob], file.name, {
      type: webBlob.type || file.mimeType || 'image/jpeg',
    });
    form.append('file', typedFile, file.name);
  } else {
    form.append('file', webBlob, file.name);
  }

  form.append('folder', folder);
  form.append('visibility', visibility);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    onProgress?.(35);
    res = await fetch(uploadUrl, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError('The upload timed out. Please try again on a stronger connection.', 408);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 && retryAuth && revision === sessionRevision()) {
    const latest = await getToken();
    if (!latest || latest === token) {
      await refreshSession();
    }
    return uploadFileToStorage(file, { ...options, retryAuth: false });
  }

  if (!res.ok) {
    let message = 'Upload failed. Please try again.';
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {}
    throw new ApiError(message, res.status);
  }

  const data = (await res.json()) as { url?: string };
  if (!data?.url) throw new ApiError('Upload did not return a file URL.', 502);
  onProgress?.(100);
  return data.url;
}
