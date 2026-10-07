import { NextRequest } from 'next/server';
import { GET as messagingCallback } from '@/app/api/oauth/[provider]/callback/route';
export async function GET(request: NextRequest) {
  return messagingCallback(request, { params: Promise.resolve({ provider: 'instagram' }) });
}
