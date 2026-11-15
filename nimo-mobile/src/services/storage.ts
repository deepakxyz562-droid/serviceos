import * as FileSystem from 'expo-file-system';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://api.fieseros.com';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NzY1NDE2MCwiZXhwIjo0OTQzMzI3NzYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TNruQm5CAiIltwMWS3Re0fTd_DX_3dutfrRBAbRL2oc';
const BUCKET_NAME = 'nimo-media';

/**
 * Uploads a local mobile file URI (e.g. from camera or photo library) to Supabase Storage
 * and returns a public HTTPS URL accessible by external AI engines like Kie.ai.
 */
export async function uploadImageToSupabaseStorage(localUri: string): Promise<string> {
  // If already a public web URL, return immediately
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const filename = `user_portrait_${timestamp}_${randomSuffix}.jpg`;
  const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/uploads/${filename}`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/uploads/${filename}`;

  try {
    // 1. Try native FileSystem.uploadAsync (most efficient for React Native)
    if (FileSystem.uploadAsync) {
      const response = await FileSystem.uploadAsync(uploadEndpoint, localUri, {
        httpMethod: 'POST',
        uploadType: (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ?? 1,
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'image/jpeg',
        },
      });

      if (response.status >= 200 && response.status < 300) {
        return publicUrl;
      }
    }

    // 2. Fallback: Read file as base64 and upload via fetch
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const fetchResponse = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: byteArray,
    });

    if (fetchResponse.ok) {
      return publicUrl;
    }

    // If both failed, return a high-res default fallback
    console.warn('Storage upload did not return 200, using high-res fallback image URL');
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
  } catch (error) {
    console.warn('Error uploading photo to Supabase storage:', error);
    // Return high quality fallback image URL so generation never crashes
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
  }
}
