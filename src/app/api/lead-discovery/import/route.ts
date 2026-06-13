import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';

// POST /api/lead-discovery/import — Import one or more discoveries as CRM Leads
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { discoveryIds, discoveryId } = body;

    // Support both array and single ID
    const ids: string[] = discoveryIds || (discoveryId ? [discoveryId] : []);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one discovery ID is required' },
        { status: 400 }
      );
    }

    // Fetch all discoveries that belong to the tenant
    const discoveries = await db.leadDiscovery.findMany({
      where: {
        id: { in: ids },
        tenantId: authUser.tenantId,
      },
    });

    if (discoveries.length === 0) {
      return NextResponse.json(
        { error: 'No matching discoveries found' },
        { status: 404 }
      );
    }

    // Filter out already imported discoveries
    const toImport = discoveries.filter(d => d.status !== 'imported' && d.status !== 'converted' && !d.leadId);

    if (toImport.length === 0) {
      return NextResponse.json(
        { error: 'All selected discoveries have already been imported' },
        { status: 400 }
      );
    }

    const createdLeads: { id: string; name: string; discoveryId: string }[] = [];
    const errors: { discoveryId: string; error: string }[] = [];

    for (const discovery of toImport) {
      try {
        // Create a Lead record
        const lead = await db.lead.create({
          data: {
            name: discovery.name,
            phone: discovery.phone || '',
            email: discovery.email || null,
            source: 'lead_discovery',
            status: 'new',
            priority: discovery.priority,
            description: discovery.description || `Imported from Lead Discovery (source: ${discovery.source})`,
            address: discovery.address || null,
            serviceType: discovery.businessType || null,
            tenantId: authUser.tenantId,
            tagsJson: discovery.tagsJson || '[]',
          },
        });

        // Update the discovery status to 'imported'
        await db.leadDiscovery.update({
          where: { id: discovery.id },
          data: {
            status: 'imported',
            leadId: lead.id,
            importedAt: new Date(),
          },
        });

        createdLeads.push({
          id: lead.id,
          name: lead.name,
          discoveryId: discovery.id,
        });

        // Emit lead.created event via EventBus
        try {
          await EventBus.emit('lead.created', {
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            source: 'lead_discovery',
            status: lead.status,
            serviceType: lead.serviceType,
            tenantId: lead.tenantId,
            resourceType: 'lead',
            resourceId: lead.id,
            summary: `Lead imported from discovery: ${lead.name} (was ${discovery.source})`,
          }, { tenantId: lead.tenantId || undefined });
        } catch (eventErr) {
          console.error('[LeadDiscoveryImport] Failed to emit lead.created event:', eventErr);
        }
      } catch (createErr) {
        console.error(`[LeadDiscoveryImport] Failed to import discovery ${discovery.id}:`, createErr);
        errors.push({
          discoveryId: discovery.id,
          error: 'Failed to create lead record',
        });
      }
    }

    // Update search record imported count if applicable
    const searchQueryIds = [...new Set(toImport.map(d => d.searchQueryId).filter(Boolean) as string[])];
    for (const searchId of searchQueryIds) {
      try {
        const currentSearch = await db.leadDiscoverySearch.findUnique({ where: { id: searchId } });
        if (currentSearch) {
          await db.leadDiscoverySearch.update({
            where: { id: searchId },
            data: {
              importedCount: currentSearch.importedCount + createdLeads.length,
            },
          });
        }
      } catch {
        // Non-critical, continue
      }
    }

    return NextResponse.json({
      imported: createdLeads,
      errors,
      summary: {
        total: ids.length,
        imported: createdLeads.length,
        skipped: discoveries.length - toImport.length,
        failed: errors.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[LeadDiscovery] Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import discoveries' },
      { status: 500 }
    );
  }
}
