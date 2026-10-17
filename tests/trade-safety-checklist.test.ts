import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRADE_SAFETY_PRESETS } from '@/lib/checklists/trade-safety-presets';
import { GET as getPresetsRoute } from '@/app/api/checklists/presets/route';
import { GET as getJobChecklistRoute, POST as postJobChecklistRoute, PATCH as patchJobChecklistRoute } from '@/app/api/jobs/[id]/checklist/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    job: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    checklist: {
      findUnique: vi.fn(),
    },
    jobChecklist: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerTimelineEntry: {
      create: vi.fn(),
    },
  },
}));

import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

describe('Trade Safety Presets & SWMS', () => {
  it('defines the 5 core trade safety presets', () => {
    expect(TRADE_SAFETY_PRESETS.length).toBeGreaterThanOrEqual(5);
    const ids = TRADE_SAFETY_PRESETS.map((p) => p.id);
    expect(ids).toContain('preset-swms-prestart');
    expect(ids).toContain('preset-electrical-loto');
    expect(ids).toContain('preset-hvac-refrigerant');
    expect(ids).toContain('preset-heights-ladder');
    expect(ids).toContain('preset-plumbing-leak-barrier');
  });

  it('each preset has valid sections, questions, and required fields', () => {
    for (const preset of TRADE_SAFETY_PRESETS) {
      expect(preset.title).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(preset.sections.length).toBeGreaterThan(0);
      for (const sec of preset.sections) {
        expect(sec.title).toBeTruthy();
        expect(sec.questions.length).toBeGreaterThan(0);
        for (const q of sec.questions) {
          expect(q.id).toBeTruthy();
          expect(q.label).toBeTruthy();
          expect(['short_answer', 'long_answer', 'dropdown', 'checkbox', 'numerical']).toContain(q.type);
          if (q.type === 'dropdown') {
            expect(q.options.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('GET /api/checklists/presets returns all trade safety presets', async () => {
    const res = await getPresetsRoute();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.presets).toHaveLength(TRADE_SAFETY_PRESETS.length);
    expect(data.total).toBe(TRADE_SAFETY_PRESETS.length);
  });
});

describe('Job Checklist API (GET, POST Upsert, PATCH)', () => {
  const mockUser = {
    id: 'emp-101',
    name: 'John Technician',
    email: 'john@example.com',
    tenantId: 'tenant-123',
    workspaceId: 'ws-456',
  };

  const mockJob = {
    id: 'job-999',
    customerId: 'cust-888',
    workspaceId: 'ws-456',
    serviceId: null,
    linkedChecklistsJson: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthUser as any).mockResolvedValue(mockUser);
    (db.job.findUnique as any).mockResolvedValue(mockJob);
    (db.workspace.findUnique as any).mockResolvedValue({ tenantId: 'tenant-123' });
  });

  it('POST creates a new JobChecklist if none exists with body.items array', async () => {
    (db.jobChecklist.findFirst as any).mockResolvedValue(null);
    const fakeCreated = {
      id: 'jc-1',
      tenantId: 'tenant-123',
      jobId: 'job-999',
      customerId: 'cust-888',
      name: 'Safety Inspection',
      itemsJson: JSON.stringify([{ id: 'item-1', label: 'Check PPE', checked: false }]),
      status: 'in_progress',
    };
    (db.jobChecklist.create as any).mockResolvedValue(fakeCreated);

    const req = new NextRequest('http://localhost/api/jobs/job-999/checklist', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Safety Inspection',
        items: [{ id: 'item-1', label: 'Check PPE', checked: false }],
      }),
    });

    const res = await postJobChecklistRoute(req, { params: Promise.resolve({ id: 'job-999' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.created).toBe(true);
    expect(data.jobChecklist.id).toBe('jc-1');
    expect(data.checklist.id).toBe('jc-1');
    expect(data.items).toEqual([{ id: 'item-1', label: 'Check PPE', checked: false }]);
  });

  it('POST upserts and updates existing checklist when one already exists', async () => {
    const existing = {
      id: 'jc-1',
      tenantId: 'tenant-123',
      jobId: 'job-999',
      customerId: 'cust-888',
      name: 'Safety Inspection',
      itemsJson: JSON.stringify([{ id: 'item-1', label: 'Check PPE', checked: false }]),
      status: 'in_progress',
    };
    (db.jobChecklist.findFirst as any).mockResolvedValue(existing);

    const updatedItems = [{ id: 'item-1', label: 'Check PPE', checked: true }];
    const updated = {
      ...existing,
      itemsJson: JSON.stringify(updatedItems),
      status: 'completed',
    };
    (db.jobChecklist.update as any).mockResolvedValue(updated);

    const req = new NextRequest('http://localhost/api/jobs/job-999/checklist', {
      method: 'POST',
      body: JSON.stringify({
        items: updatedItems,
        status: 'completed',
      }),
    });

    const res = await postJobChecklistRoute(req, { params: Promise.resolve({ id: 'job-999' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.created).toBe(false);
    expect(data.updated).toBe(true);
    expect(data.jobChecklist.status).toBe('completed');
    expect(data.items).toEqual(updatedItems);
    expect(db.customerTimelineEntry.create).toHaveBeenCalled();
  });

  it('PATCH updates items from body.items and returns normalized response', async () => {
    const existing = {
      id: 'jc-1',
      tenantId: 'tenant-123',
      jobId: 'job-999',
      customerId: 'cust-888',
      name: 'Safety Inspection',
      itemsJson: JSON.stringify([{ id: 'item-1', label: 'Check PPE', checked: false }]),
      status: 'in_progress',
    };
    (db.jobChecklist.findFirst as any).mockResolvedValue(existing);

    const updatedItems = [{ id: 'item-1', label: 'Check PPE', checked: true }];
    const updated = {
      ...existing,
      itemsJson: JSON.stringify(updatedItems),
    };
    (db.jobChecklist.update as any).mockResolvedValue(updated);

    const req = new NextRequest('http://localhost/api/jobs/job-999/checklist', {
      method: 'PATCH',
      body: JSON.stringify({
        items: updatedItems,
      }),
    });

    const res = await patchJobChecklistRoute(req, { params: Promise.resolve({ id: 'job-999' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobChecklist).toBeDefined();
    expect(data.checklist).toBeDefined();
    expect(data.items).toEqual(updatedItems);
  });

  it('GET returns jobChecklist, checklist alias, and parsed items array', async () => {
    const existing = {
      id: 'jc-1',
      tenantId: 'tenant-123',
      jobId: 'job-999',
      customerId: 'cust-888',
      name: 'Safety Inspection',
      itemsJson: JSON.stringify([
        { id: 'item-1', label: 'Check PPE', checked: true },
        { id: 'item-2', label: 'Site Hazard Sign-off', checked: false },
      ]),
      status: 'in_progress',
    };
    (db.jobChecklist.findFirst as any).mockResolvedValue(existing);

    const req = new NextRequest('http://localhost/api/jobs/job-999/checklist');
    const res = await getJobChecklistRoute(req, { params: Promise.resolve({ id: 'job-999' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobChecklist.id).toBe('jc-1');
    expect(data.checklist.id).toBe('jc-1');
    expect(data.items).toHaveLength(2);
    expect(data.items[0].checked).toBe(true);
    expect(data.items[1].checked).toBe(false);
  });
});
