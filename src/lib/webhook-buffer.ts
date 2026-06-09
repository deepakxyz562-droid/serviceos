// Webhook test request buffer — backed by database for reliability across Next.js route handlers
// Previously used in-memory Map, but Next.js App Router may not share module state between routes

import { db } from '@/lib/db';

interface WebhookRequest {
  id: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  receivedAt: string;
  contentType: string;
}

const MAX_BUFFER_PER_PATH = 50;

export async function addWebhookRequest(request: WebhookRequest): Promise<void> {
  try {
    await db.webhookTestRequest.create({
      data: {
        path: request.path,
        method: request.method,
        headersJson: JSON.stringify(request.headers),
        queryParamsJson: JSON.stringify(request.queryParams),
        bodyJson: request.body != null ? JSON.stringify(request.body) : null,
        contentType: request.contentType,
        receivedAt: new Date(request.receivedAt),
      },
    });

    // Prune old requests (keep only last MAX_BUFFER_PER_PATH per path)
    const allForPath = await db.webhookTestRequest.findMany({
      where: { path: request.path },
      orderBy: { receivedAt: 'desc' },
      select: { id: true },
    });

    if (allForPath.length > MAX_BUFFER_PER_PATH) {
      const idsToDelete = allForPath.slice(MAX_BUFFER_PER_PATH).map((r) => r.id);
      await db.webhookTestRequest.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  } catch (error) {
    console.error('[WebhookBuffer] Failed to store test request:', error);
  }
}

export async function getWebhookRequests(
  path: string,
  since?: string,
): Promise<WebhookRequest[]> {
  try {
    const where: any = { path };
    if (since) {
      where.receivedAt = { gt: new Date(since) };
    }

    const records = await db.webhookTestRequest.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });

    return records.map((r) => ({
      id: r.id,
      path: r.path,
      method: r.method,
      headers: JSON.parse(r.headersJson || '{}'),
      queryParams: JSON.parse(r.queryParamsJson || '{}'),
      body: r.bodyJson ? JSON.parse(r.bodyJson) : null,
      receivedAt: r.receivedAt.toISOString(),
      contentType: r.contentType,
    }));
  } catch (error) {
    console.error('[WebhookBuffer] Failed to retrieve test requests:', error);
    return [];
  }
}

export async function clearWebhookRequests(path: string): Promise<void> {
  try {
    await db.webhookTestRequest.deleteMany({ where: { path } });
  } catch (error) {
    console.error('[WebhookBuffer] Failed to clear test requests:', error);
  }
}
