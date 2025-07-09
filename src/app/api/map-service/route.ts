import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, message: 'Missing lat or lng parameter' },
        { status: 400 }
      );
    }

    // Call internal FastAPI map-service endpoint (avoids CORS / HTML response)
    const apiUrl = `${process.env.NEXT_PUBLIC_GULAND_SERVER_URL || 'http://localhost:8000'}/map-service?lat=${lat}&lng=${lng}`;

    console.log(`🔗 Fetching map-service data from FastAPI: ${apiUrl}`);

    const apiRes = await fetch(apiUrl, {
      // Forward the original request headers (except host) if needed
      headers: {
        'Content-Type': 'application/json',
      },
      // `next` option ensures Next.js caches respect (here we disable caching)
      next: { revalidate: 0 },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('Map-service upstream error', apiRes.status, text);
      return NextResponse.json(
        { success: false, message: 'Upstream map-service error', status: apiRes.status },
        { status: 502 },
      );
    }

    let data: any;
    try {
      data = await apiRes.json();
    } catch (jsonErr) {
      // In case backend returns plain HTML error, wrap it
      const text = await apiRes.text();
      console.error('Map-service non-JSON response, returning as text');
      return NextResponse.json({ success: false, html: text, status: apiRes.status }, { status: apiRes.status });
    }

    // Pass-through response from Guland
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Map service error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 