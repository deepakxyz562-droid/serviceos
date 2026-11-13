import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as sendOtpPost } from '@/app/api/auth/phone/send-otp/route';
import { POST as verifyOtpPost } from '@/app/api/auth/phone/verify-otp/route';
import { POST as firebaseSessionPost } from '@/app/api/auth/firebase/session/route';

function normalizePhoneNumber(rawPhone: string, defaultCountryCode = '+91'): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    const cleanPrefix = defaultCountryCode.replace(/\D/g, '');
    return `+${cleanPrefix}${digits}`;
  }
  if (rawPhone.startsWith('+')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

describe('Phone Number Normalization', () => {
  it('normalizes 10-digit Indian numbers to E.164 +91', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber('98765 43210')).toBe('+919876543210');
  });

  it('preserves existing + country code', () => {
    expect(normalizePhoneNumber('+14155552671')).toBe('+14155552671');
    expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
  });
});

describe('POST /api/auth/phone/send-otp', () => {
  it('returns 400 when phone number is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await sendOtpPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Phone number is required/i);
  });

  it('returns 400 for invalid short phone number', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '123' }),
    });
    const res = await sendOtpPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/valid phone number/i);
  });

  it('generates test OTP for test number +91 99999 99999', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '9999999999' }),
    });
    const res = await sendOtpPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.devOtp).toBe('123456');
  });
});

describe('POST /api/auth/phone/verify-otp', () => {
  it('returns 400 when OTP code is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '9999999999' }),
    });
    const res = await verifyOtpPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Verification code is required/i);
  });

  it('returns 400 when OTP code is incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '9999999999', otpCode: '000000' }),
    });
    const res = await verifyOtpPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid code/i);
  });

  it('successfully verifies test OTP and logs in / provisions merchant', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '9999999999', otpCode: '123456' }),
    });
    const res = await verifyOtpPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.role).toBe('owner');
  }, 15000);
});

describe('POST /api/auth/firebase/session', () => {
  it('returns 400 when idToken is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/firebase/session', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await firebaseSessionPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/idToken is required/i);
  });

  it('handles mock Firebase dev token, provisions merchant, and issues JWT', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/firebase/session', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock_token_+919999999999' }),
    });
    const res = await firebaseSessionPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.phone).toBe('+919999999999');
  }, 15000);
});
