import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/proxy/email/route';
import { NextRequest } from 'next/server';

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/proxy/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/proxy/email', () => {
  it('rejects missing or invalid email', async () => {
    const res = await POST(createJsonRequest({ action: 'send_otp', email: 'invalid-email' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Valid email address is required');
  });

  it('generates devCode when no RESEND_API_KEY is present', async () => {
    const res = await POST(createJsonRequest({
      action: 'send_otp',
      email: 'tester@example.com',
      codeLength: 6,
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.devCode).toBeDefined();
    expect(json.devCode).toHaveLength(6);
  });

  it('verifies code correctly and rejects incorrect attempts', async () => {
    const testEmail = 'verify-test@example.com';
    // 1. Send OTP
    const sendRes = await POST(createJsonRequest({
      action: 'send_otp',
      email: testEmail,
      codeLength: 6,
    }));
    const sendJson = await sendRes.json();
    const generatedCode = sendJson.devCode;
    expect(generatedCode).toBeDefined();

    // 2. Verify invalid code
    const badVerifyRes = await POST(createJsonRequest({
      action: 'verify_otp',
      email: testEmail,
      code: '000000',
    }));
    const badJson = await badVerifyRes.json();
    expect(badJson.verified).toBe(false);
    expect(badJson.error).toBe('Invalid code');
    expect(badJson.attemptsLeft).toBe(4);

    // 3. Verify valid code
    const goodVerifyRes = await POST(createJsonRequest({
      action: 'verify_otp',
      email: testEmail,
      code: generatedCode,
    }));
    const goodJson = await goodVerifyRes.json();
    expect(goodJson.verified).toBe(true);
    expect(goodJson.success).toBe(true);

    // 4. Re-verifying used code should fail because it is single-use
    const reVerifyRes = await POST(createJsonRequest({
      action: 'verify_otp',
      email: testEmail,
      code: generatedCode,
    }));
    expect(reVerifyRes.status).toBe(400);
  });
});
