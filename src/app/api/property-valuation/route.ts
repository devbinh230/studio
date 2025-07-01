import { NextRequest, NextResponse } from 'next/server';
import { propertyValuationRange } from '@/ai/flows/property-valuation';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await propertyValuationRange(data);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
} 