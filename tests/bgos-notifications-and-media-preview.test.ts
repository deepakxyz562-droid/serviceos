import { describe, it, expect, vi } from 'vitest';
import { resolvePhotoUrl } from '../bgosmobile/src/lib/constants';
import { notificationDestination } from '../bgosmobile/src/lib/notification-routing';

describe('BGOS Photo URI Resolution & Media Preview', () => {
  it('preserves native Android content:// URIs without corrupting with domain host', () => {
    const androidUri = 'content://media/external/images/media/1000045231';
    expect(resolvePhotoUrl(androidUri)).toBe(androidUri);
  });

  it('preserves native iOS ph:// and assets-library:// URIs', () => {
    const iosPhUri = 'ph://ED7AC36B-A150-4C38-BB8C-B6D69C1469A3/L0/001';
    const legacyIosUri = 'assets-library://asset/asset.JPG?id=100000001&ext=JPG';
    expect(resolvePhotoUrl(iosPhUri)).toBe(iosPhUri);
    expect(resolvePhotoUrl(legacyIosUri)).toBe(legacyIosUri);
  });

  it('preserves file://, data:, and blob: URIs', () => {
    expect(resolvePhotoUrl('file:///var/mobile/Containers/Data/Application/img.jpg')).toBe(
      'file:///var/mobile/Containers/Data/Application/img.jpg',
    );
    expect(resolvePhotoUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(
      'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    );
    expect(resolvePhotoUrl('blob:https://bgos.site/a87e834c-1234')).toBe(
      'blob:https://bgos.site/a87e834c-1234',
    );
  });

  it('resolves server uploaded assets (/uploads/...) to main app domain (fieseros.com)', () => {
    const uploadPath = '/uploads/campaign-assets/company_123/gbp-media/photo.jpg';
    const resolved = resolvePhotoUrl(uploadPath);
    expect(resolved).toContain('fieseros.com/uploads/campaign-assets/company_123/gbp-media/photo.jpg');
    expect(resolved).not.toContain('bgos.site');
  });

  it('resolves template assets to bgos.site domain', () => {
    const templatePath = '/images/bgos/templates/diwali.webp';
    const resolved = resolvePhotoUrl(templatePath);
    expect(resolved).toBe('https://bgos.site/images/bgos/templates/diwali.webp');
  });
});

describe('BGOS Notification Routing & Chat Deep Links', () => {
  it('routes chat push notifications with route: "/inbox" and sessionId to /inbox', () => {
    const payload = {
      route: '/inbox',
      sessionId: 'sess_12345',
      type: 'live_chat_message',
    };
    const dest = notificationDestination(payload);
    expect(dest).toBe('/inbox?sessionId=sess_12345');
  });

  it('routes conversation message notifications with conversationId to /inbox', () => {
    const payload = {
      route: '/inbox',
      conversationId: 'conv_98765',
    };
    const dest = notificationDestination(payload);
    expect(dest).toBe('/inbox?conversationId=conv_98765');
  });

  it('routes daily growth and marketing notifications to /(tabs)/marketing with mode=studio', () => {
    const payload = {
      route: '/(tabs)/marketing',
      mode: 'studio',
      themeKey: 'daily_growth_tips',
    };
    const dest = notificationDestination(payload);
    expect(dest).toBe('/(tabs)/marketing?mode=studio');
  });
});
