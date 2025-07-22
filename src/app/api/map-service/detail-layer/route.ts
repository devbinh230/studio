import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get('layerId');
  
  try {
    const response = await axios.get(`https://guland.vn/api/planning/map/detail-layer?id=${layerId}`);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching detail layer:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch detail layer' }, { status: 500 });
  }
}

// Add the tile proxy function
export async function POST(request: Request) {
  try {
    const { tileUrl } = await request.json();
    
    if (!tileUrl) {
      return NextResponse.json({ success: false, message: 'No tile URL provided' }, { status: 400 });
    }

    const response = await axios.get(tileUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://guland.vn/',
        'Origin': 'https://guland.vn',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // Return the image with appropriate headers
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': response.headers['content-type'] || 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      }
    });
  } catch (error) {
    console.error('Error proxying tile:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch tile' }, { status: 500 });
  }
} 