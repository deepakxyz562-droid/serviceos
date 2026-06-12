import { NextRequest, NextResponse } from 'next/server'

const OWNER_TEMPLATE = `🎯 New Lead from Website!

Name: {{name}}
Phone: {{phone}}
Email: {{email}}
Service: {{serviceType}}
Message: {{description}}

Follow up promptly!`

const CUSTOMER_TEMPLATE = `Thank you for contacting us, {{name}}! 🙏

We have received your inquiry about {{serviceType}}. Our team will contact you shortly.

— {{companyName}}`

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()
    
    if (type === 'owner') {
      return NextResponse.json({ template: OWNER_TEMPLATE })
    } else if (type === 'customer') {
      return NextResponse.json({ template: CUSTOMER_TEMPLATE })
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
