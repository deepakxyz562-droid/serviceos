import { NextResponse } from 'next/server';
import { nodeRegistry, nodeCategories, getNodesByCategory } from '@/lib/node-registry';

export async function GET() {
  try {
    const categories = nodeCategories.map((cat) => ({
      ...cat,
      nodes: getNodesByCategory(cat.id),
    }));

    return NextResponse.json({
      categories,
      allNodes: nodeRegistry,
      totalNodes: nodeRegistry.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch node types' },
      { status: 500 }
    );
  }
}
