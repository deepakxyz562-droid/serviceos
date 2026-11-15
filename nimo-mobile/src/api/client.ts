import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
    : 'https://fieseros.com');

const TOKEN_KEY = 'nimo_auth_token';
const DEVICE_ID_KEY = 'nimo_device_id';

let cachedToken: string | null = null;
let cachedDeviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
      id = '00000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14).padEnd(12, '0');
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    return '00000000-0000-0000-0000-000000000001';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const deviceId = await getDeviceId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-nimo-user-id': deviceId,
    ...(options.headers as Record<string, string>),
  };

  if (!headers['Authorization'] && cachedToken) {
    headers['Authorization'] = `Bearer ${cachedToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || (json && json.success === false)) {
    const errorMsg = json?.error || `HTTP ${response.status}: Network request failed`;
    throw new Error(errorMsg);
  }

  return json?.data !== undefined ? json.data : json;
}

export const nimoApi = {
  // Catalog
  async getCategories() {
    return request<any[]>('/api/nimo/categories');
  },

  async getTemplates(params?: { category?: string; q?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.q) query.append('q', params.q);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/api/nimo/templates${qs}`);
  },

  async getTemplateById(id: string) {
    return request<any>(`/api/nimo/templates/${id}`);
  },

  // Photo Upload Presigning
  async getUploadUrl(filename: string, mimeType: string) {
    return request<{ storagePath: string; uploadUrl?: string; signedUrl?: string; fileUrl: string }>(
      '/api/nimo/media/upload-url',
      {
        method: 'POST',
        body: JSON.stringify({ filename, mimeType }),
      }
    );
  },

  // AI Generation
  async createGeneration(input: {
    templateId: string;
    photoUrls: string[];
    aspectRatio?: string;
    idempotencyKey?: string;
  }) {
    return request<{ jobId: string; status: string; coinCost: number; reservedCoins: number }>(
      '/api/nimo/generations',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async getJobStatus(jobId: string) {
    return request<{
      jobId: string;
      status: 'queued' | 'processing' | 'completed' | 'failed';
      stage?: string;
      progressPercent?: number;
      result?: { mediaId?: string; imageUrl?: string };
      error?: string;
    }>(`/api/nimo/generations/${jobId}`);
  },

  // Wallet & Coins
  async getCoinBalance() {
    return request<{ available: number; reserved: number; total: number }>('/api/nimo/credits/balance');
  },

  async getCoinProducts() {
    return request<any[]>('/api/nimo/credits/products');
  },

  async getTransactions() {
    return request<any[]>('/api/nimo/credits/transactions');
  },

  // Magic Gallery
  async getGallery(page = 1, limit = 20) {
    return request<any[]>(`/api/nimo/gallery?page=${page}&limit=${limit}`);
  },

  async deleteGalleryItem(mediaId: string) {
    return request<{ success: boolean }>(`/api/nimo/gallery/${mediaId}`, {
      method: 'DELETE',
    });
  },

  // AI Identity Profile
  async getIdentityPhotos() {
    return request<any>('/api/nimo/identity');
  },

  async saveIdentityPhotos(photoUrls: string[]) {
    return request<any>('/api/nimo/identity', {
      method: 'POST',
      body: JSON.stringify({ photoUrls }),
    });
  },

  // Profile & Moderation
  async getProfile() {
    return request<any>('/api/nimo/me');
  },

  async reportContent(data: { mediaId?: string; templateId?: string; reason: string; description?: string }) {
    return request<{ referenceNumber: string }>('/api/nimo/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
