import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const journeys = await db.journey.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(journeys)
  } catch (error) {
    console.error('Failed to list journeys:', error)
    return NextResponse.json(
      { error: 'Failed to list journeys' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, triggerType, triggerConfig, stepsJson } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const journey = await db.journey.create({
      data: {
        name,
        description: description ?? null,
        triggerType: triggerType ?? null,
        triggerConfig: triggerConfig
          ? typeof triggerConfig === 'string'
            ? triggerConfig
            : JSON.stringify(triggerConfig)
          : '{}',
        stepsJson: stepsJson
          ? typeof stepsJson === 'string'
            ? stepsJson
            : JSON.stringify(stepsJson)
          : '[]',
      },
    })

    return NextResponse.json(journey, { status: 201 })
  } catch (error) {
    console.error('Failed to create journey:', error)
    return NextResponse.json(
      { error: 'Failed to create journey' },
      { status: 500 }
    )
  }
}
