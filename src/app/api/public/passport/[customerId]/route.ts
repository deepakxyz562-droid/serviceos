import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { name: true, address: true, firstName: true, lastName: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const assets = await db.customerAsset.findMany({
      where: { customerId },
    });

    const assetIds = assets.map(a => a.id);

    const assetHistories = await db.assetServiceHistory.findMany({
      where: { assetId: { in: assetIds } },
      orderBy: { serviceDate: 'desc' },
    });

    const activeWarranties = await db.warranty.findMany({
      where: { customerId, isActive: true },
    });

    function computeHealthScore(asset: {
      warrantyEnd?: Date | null;
      nextServiceDate?: Date | null;
      lastServiceDate?: Date | null;
    }): 'healthy' | 'due_soon' | 'overdue' | 'critical' {
      const now = new Date();
      const warrantyExpired = asset.warrantyEnd && asset.warrantyEnd < now;
      const nextService = asset.nextServiceDate;
      
      if (!nextService) {
        if (warrantyExpired) return 'critical';
        return 'healthy';
      }
      
      const daysUntil = Math.floor((nextService.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < -30) return warrantyExpired ? 'critical' : 'overdue';
      if (daysUntil < 0) return 'overdue';
      if (daysUntil <= 60) return 'due_soon';
      return 'healthy';
    }

    const resultAssets = assets.map(asset => {
      const histories = assetHistories.filter(h => h.assetId === asset.id);
      const recentHistory = histories.slice(0, 3).map(h => ({
        serviceDate: h.serviceDate.toISOString(),
        serviceType: h.serviceType,
        notes: h.notes,
        performedByName: h.performedByName,
      }));

      const latestService = histories[0];
      const lastServiceDate = latestService?.serviceDate ? latestService.serviceDate.toISOString() : null;
      const nextServiceDate = latestService?.nextServiceDate ? latestService.nextServiceDate.toISOString() : null;

      const healthScore = computeHealthScore({
        warrantyEnd: asset.warrantyEnd,
        nextServiceDate: latestService?.nextServiceDate,
        lastServiceDate: latestService?.serviceDate,
      });

      return {
        id: asset.id,
        name: asset.name,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        installedAt: asset.installationDate ? asset.installationDate.toISOString() : null,
        warrantyEnd: asset.warrantyEnd ? asset.warrantyEnd.toISOString() : null,
        warrantyStatus: asset.warrantyStatus,
        lastServiceDate,
        nextServiceDate,
        healthScore,
        activeWarranties: activeWarranties.map(w => ({
          title: w.title,
          coverage: w.coverage,
          endDate: w.endDate ? w.endDate.toISOString() : null,
        })),
        recentHistory,
      };
    });
    
    const customerName = customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : customer.name;

    return NextResponse.json({
      customer: { name: customerName, address: customer.address },
      assets: resultAssets,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching passport data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
