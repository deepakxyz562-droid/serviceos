import { describe, it, expect } from 'vitest';
import { parseAddress, formatAddress } from '@/components/bgos/settings';

describe('BGOS Settings Address Parser & Formatter', () => {
  it('correctly parses raw JSON address strings from database', () => {
    const rawJson = '{"street":"1/7 Macbarry pl, Rocklea QLD, 4106","city":"Rocklea","state":"","pincode":"","country":"AU"}';
    const parsed = parseAddress(rawJson);

    expect(parsed.street).toBe('1/7 Macbarry pl, Rocklea QLD, 4106');
    expect(parsed.city).toBe('Rocklea');
    expect(parsed.country).toBe('AU');
  });

  it('formats address fields into a clean readable string', () => {
    const parsed = {
      street: '1/7 Macbarry pl',
      city: 'Rocklea',
      state: 'QLD',
      pincode: '4106',
      country: 'AU',
    };
    const formatted = formatAddress(parsed);
    expect(formatted).toBe('1/7 Macbarry pl, Rocklea, QLD, 4106, AU');
  });

  it('handles null, undefined and plain string addresses gracefully', () => {
    expect(parseAddress(null)).toEqual({ street: '', city: '', state: '', pincode: '', country: '' });
    expect(parseAddress(undefined)).toEqual({ street: '', city: '', state: '', pincode: '', country: '' });
    expect(parseAddress('123 Main Street, Brisbane')).toEqual({
      street: '123 Main Street, Brisbane',
      city: '',
      state: '',
      pincode: '',
      country: '',
    });
  });
});
