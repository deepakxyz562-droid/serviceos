import { NextResponse } from 'next/server';

const industries = [
  { id: 'plumbing', label: 'Plumbing', icon: '🔧', description: 'Pipe repair, installation and maintenance services' },
  { id: 'hvac', label: 'HVAC', icon: '❄️', description: 'Heating, ventilation and air conditioning' },
  { id: 'electrical', label: 'Electrical', icon: '⚡', description: 'Electrical installation and repair services' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹', description: 'Residential and commercial cleaning' },
  { id: 'landscaping', label: 'Landscaping', icon: '🌿', description: 'Lawn care, garden design and maintenance' },
  { id: 'painting', label: 'Painting', icon: '🎨', description: 'Interior and exterior painting services' },
  { id: 'moving', label: 'Moving', icon: '📦', description: 'Residential and commercial moving services' },
  { id: 'delivery', label: 'Delivery', icon: '🚚', description: 'Last-mile and express delivery services' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️', description: 'Food service and restaurant operations' },
  { id: 'retail', label: 'Retail', icon: '🛍️', description: 'Retail store operations and management' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥', description: 'Medical and healthcare services' },
];

export async function GET() {
  return NextResponse.json(industries);
}
