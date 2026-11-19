import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export const dynamic = 'force-dynamic';

const ALLOWED_FILES: Record<string, string> = {
  'bgos-tutorial.mp4': 'bgos-tutorial.mp4',
  'boost-google-ranking.mp4': 'boost-google-ranking.mp4',
  'gbp-performance-analysis.mp4': 'gbp-performance-analysis.mp4',
  'how-to-get-reviews.mp4': 'how-to-get-reviews.mp4',
  'reviews-build-trust.mp4': 'reviews-build-trust.mp4',
  'why-gbp-photos.mp4': 'why-gbp-photos.mp4',
};

function resolveVideoPath(fileName: string | null): string | null {
  const clean = path.basename(fileName || 'bgos-tutorial.mp4').trim();
  const matched = ALLOWED_FILES[clean] || 'bgos-tutorial.mp4';
  const fullPath = path.join(process.cwd(), 'public', 'bgos', 'tutorials', matched);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file') || searchParams.get('name');
  const filePath = resolveVideoPath(file);

  if (!filePath) {
    return new NextResponse(null, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file') || searchParams.get('name');
  const filePath = resolveVideoPath(file);

  if (!filePath) {
    return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = request.headers.get('range');

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
  };

  // If client requested byte-range (iOS Safari, WKWebView AVPlayer, Chrome, Android)
  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    // Chunk size: at most 5MB at a time for smooth streaming and quick seek
    const CHUNK_MAX = 5 * 1024 * 1024;
    const requestedEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const end = Math.min(requestedEnd, start + CHUNK_MAX - 1, fileSize - 1);

    if (start >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
          ...baseHeaders,
        },
      });
    }

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': String(chunkSize),
      },
    });
  }

  // Full content request
  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream);

  return new NextResponse(webStream as unknown as BodyInit, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(fileSize),
    },
  });
}
