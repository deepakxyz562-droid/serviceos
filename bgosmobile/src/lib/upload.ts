import { API_BASE_URL } from './constants';
import { ApiError } from './api';
import { getToken } from './auth';

export type PendingUpload = {
  uri: string;
  name: string;
  mimeType: string;
};

/**
 * Uploads a local device file to BGOS storage via the authenticated multipart
 * endpoint (POST /api/omnichannel/upload — allowed for any operator account)
 * and returns the public URL that downstream APIs (e.g. /api/social/photos,
 * which hands sourceUrl to Google) can consume.
 */
export async function uploadFileToStorage(file: PendingUpload): Promise<string> {
  const token = await getToken();
  const form = new FormData();
  // React Native FormData part — { uri, name, type } shape.
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/omnichannel/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) throw new ApiError('The upload timed out. Please try again.', 408);
    throw err;
  } finally {
    clearTimeout(timeout);
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
  return data.url;
}
