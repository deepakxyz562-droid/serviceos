import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function jsonNotFound(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'API endpoint not found',
      path: request.nextUrl.pathname,
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}

export async function GET(request: NextRequest) {
  return jsonNotFound(request);
}

export async function POST(request: NextRequest) {
  return jsonNotFound(request);
}

export async function PUT(request: NextRequest) {
  return jsonNotFound(request);
}

export async function PATCH(request: NextRequest) {
  return jsonNotFound(request);
}

export async function DELETE(request: NextRequest) {
  return jsonNotFound(request);
}

export async function OPTIONS(request: NextRequest) {
  return jsonNotFound(request);
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 404,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
