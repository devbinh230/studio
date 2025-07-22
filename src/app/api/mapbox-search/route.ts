import { NextRequest, NextResponse } from 'next/server';
import { getMapboxAccessToken } from '@/lib/config';

// GET /api/mapbox-search?q=<query>
// Proxies Mapbox SearchBox API from the server so we can control headers (e.g. Referer).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Missing "q" query parameter' },
      { status: 400 }
    );
  }

  try {
    const mapboxToken = getMapboxAccessToken();

    const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
      query
    )}&country=vn&types=address,street,district,city&auto_complete=true&access_token=${mapboxToken}&language=vi&limit=5`;

    const mapboxResponse = await fetch(url, {
      method: 'GET',
      headers: {
        accept: '*/*',
        referer: 'https://docs.mapbox.com/', // Custom referer as requested
      },
      // Prevent Next.js from caching this data; address privacy & freshness
      cache: 'no-store',
    });

    if (!mapboxResponse.ok) {
      const text = await mapboxResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `Mapbox API error ${mapboxResponse.status}: ${text}`,
        },
        { status: mapboxResponse.status }
      );
    }

    const data = await mapboxResponse.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
