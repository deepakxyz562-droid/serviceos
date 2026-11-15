import { getNimoServiceClient } from './supabase';

export interface IdentityPhoto {
  id: string;
  storage_path: string;
  created_at: string;
}

export interface IdentityAlbumResult {
  hasIdentity: boolean;
  albumId?: string;
  photos: IdentityPhoto[];
}

export class IdentityService {
  /**
   * Fetch the user's primary AI Identity photo album and reference photos
   */
  static async getIdentityAlbum(userId: string): Promise<IdentityAlbumResult> {
    const supabase = getNimoServiceClient();

    try {
      // 1. Get or find primary identity album
      let { data: album } = await supabase
        .from('photo_albums')
        .select('*')
        .eq('user_id', userId)
        .eq('is_identity', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!album) {
        return {
          hasIdentity: false,
          photos: [],
        };
      }

      // 2. Fetch photos in this album
      const { data: photos } = await supabase
        .from('uploaded_photos')
        .select('id, storage_path, created_at')
        .eq('user_id', userId)
        .eq('album_id', album.id)
        .order('created_at', { ascending: false });

      return {
        hasIdentity: (photos && photos.length > 0) || false,
        albumId: album.id,
        photos: (photos || []).map((p) => ({
          id: p.id,
          storage_path: p.storage_path,
          created_at: p.created_at,
        })),
      };
    } catch {
      return {
        hasIdentity: false,
        photos: [],
      };
    }
  }

  /**
   * Save or append reference photos to user's AI Identity album (5-10 photos)
   */
  static async saveIdentityPhotos(userId: string, photoUrls: string[]): Promise<IdentityAlbumResult> {
    const supabase = getNimoServiceClient();

    // 1. Find or create default identity album
    let { data: album } = await supabase
      .from('photo_albums')
      .select('id')
      .eq('user_id', userId)
      .eq('is_identity', true)
      .limit(1)
      .single();

    if (!album) {
      const { data: newAlbum } = await supabase
        .from('photo_albums')
        .insert({
          user_id: userId,
          name: 'My AI Identity',
          is_identity: true,
        })
        .select('id')
        .single();
      album = newAlbum;
    }

    const albumId = album?.id || crypto.randomUUID();

    // 2. Insert photos into uploaded_photos
    const rows = photoUrls.map((url) => ({
      user_id: userId,
      album_id: albumId,
      storage_path: url,
      mime_type: 'image/jpeg',
      is_identity_ref: true,
    }));

    await supabase.from('uploaded_photos').insert(rows);

    return this.getIdentityAlbum(userId);
  }

  /**
   * Remove a photo from identity album
   */
  static async removeIdentityPhoto(userId: string, photoId: string): Promise<boolean> {
    const supabase = getNimoServiceClient();
    const { error } = await supabase
      .from('uploaded_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);

    return !error;
  }
}
