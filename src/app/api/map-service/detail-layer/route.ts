import { NextRequest, NextResponse } from 'next/server';
import { GULAND_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Missing id parameter' },
        { status: 400 }
      );
    }

    // Call FastAPI detail-layer endpoint
    const apiUrl = `${GULAND_CONFIG.SERVER_URL}/map-service/detail-layer?id=${id}`;

    console.log('🔗 Fetching detail-layer from FastAPI:', apiUrl);

    const apiRes = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(GULAND_CONFIG.AUTH_TOKEN ? { 'Authorization': `Bearer ${GULAND_CONFIG.AUTH_TOKEN}` } : {}),
      },
      next: { revalidate: 0 },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('Detail-layer upstream error', apiRes.status, text);
      return NextResponse.json(
        { success: false, message: 'Upstream detail-layer error', status: apiRes.status },
        { status: 502 },
      );
    }

    let data: any;
    try {
      data = await apiRes.json();
    } catch (jsonErr) {
      const text = await apiRes.text();
      console.error('Detail-layer non-JSON response, returning as text');
      return NextResponse.json({ success: false, html: text, status: apiRes.status }, { status: apiRes.status });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Detail layer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 