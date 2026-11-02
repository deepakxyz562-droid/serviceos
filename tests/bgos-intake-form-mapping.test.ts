import { describe, it, expect } from 'vitest';
import type { BgosWorkspace } from '../shared/bgos-contracts';

describe('BGOS Intake Form Contract and Mapping', () => {
  it('supports intakeForm metadata on BgosWorkspace contract', () => {
    const workspace: BgosWorkspace = {
      id: 'ws-123',
      name: "Deepak Chandra's Workspace",
      slug: 'deepak-chandras-workspace-1',
      businessName: 'Fieseros Pro Services',
      tagline: 'Professional home services',
      phone: '+919999999999',
      email: 'deepak@fieseros.com',
      website: 'https://fieseros.com',
      address: 'Bengaluru, KA',
      rating: 5,
      reviewCount: 1,
      intakeForm: {
        id: 'qRCrDT8WYx-PKZe6zTuDayK89',
        name: 'Appointment Booking',
        slug: 'appointment-booking',
      },
      links: {
        portal: '/p/deepak-chandras-workspace-1',
        booking: '/book/deepak-chandras-workspace-1',
        services: '/p/deepak-chandras-workspace-1#services',
        form: '/f/appointment-booking',
        reviews: '/p/deepak-chandras-workspace-1#reviews',
      },
    };

    expect(workspace.intakeForm?.id).toBe('qRCrDT8WYx-PKZe6zTuDayK89');
    expect(workspace.intakeForm?.name).toBe('Appointment Booking');
    expect(workspace.intakeForm?.slug).toBe('appointment-booking');
    expect(workspace.links.form).toBe('/f/appointment-booking');
  });

  it('handles null intakeForm when no forms exist', () => {
    const workspace: BgosWorkspace = {
      id: 'ws-empty',
      name: 'Empty Workspace',
      slug: 'empty-ws',
      businessName: 'New Business',
      tagline: null,
      phone: null,
      email: 'owner@example.com',
      website: null,
      address: null,
      rating: 0,
      reviewCount: 0,
      intakeForm: null,
      links: {
        portal: '/p/empty-ws',
        booking: '/book/empty-ws',
        services: '/p/empty-ws#services',
        form: null,
        reviews: '/p/empty-ws#reviews',
      },
    };

    expect(workspace.intakeForm).toBeNull();
    expect(workspace.links.form).toBeNull();
  });
});
