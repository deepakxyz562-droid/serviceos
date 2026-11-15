import { NextResponse } from 'next/server';

export async function GET() {
  const plans = [
    {
      id: 'sub_weekly',
      code: 'nimo_vip_weekly',
      title: 'Weekly VIP',
      priceInr: 149.00,
      billingCycle: 'week',
      coinsPerCycle: 25,
      features: [
        '25 Free Weekly Coins',
        'Access to VIP Portrait Styles',
        'Fast-Lane Queue Processing',
        'HD Downloads without Watermarks',
      ],
    },
    {
      id: 'sub_monthly',
      code: 'nimo_vip_monthly',
      title: 'Monthly Pro',
      priceInr: 399.00,
      billingCycle: 'month',
      coinsPerCycle: 100,
      badge: 'MOST POPULAR',
      features: [
        '100 Free Monthly Coins',
        'Full Access to 50+ VIP Styles',
        'Instant Priority AI Generation',
        '4K Ultra-HD Downloads',
        'No Watermarks on Output',
      ],
    },
    {
      id: 'sub_annual',
      code: 'nimo_vip_annual',
      title: 'Annual Studio VIP',
      priceInr: 2499.00,
      billingCycle: 'year',
      coinsPerCycle: 1500,
      badge: 'BEST VALUE (SAVE 65%)',
      features: [
        '1,500 Total Yearly Coins',
        'Early Access to New Studio Drops',
        'VIP WhatsApp & Email Support',
        'Maximum Generation Speed',
      ],
    },
  ];

  return NextResponse.json({ success: true, data: plans });
}
