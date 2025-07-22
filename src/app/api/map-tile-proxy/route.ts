"use server";

import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/map-tile-proxy:
 *   get:
 *     summary: Proxy for map tiles to avoid CORS issues
 *     description: Proxies requests to various map tile providers and handles authentication
 *     parameters:
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         required: true
 *         description: The tile URL to proxy
 *     responses:
 *       200:
 *         description: Map tile image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Tile not found
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ 
        error: 'Missing url parameter'
      }, { status: 400 });
    }
    
    console.log(`Proxying map tile: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://maps.google.com/'
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch tile: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      }
    });
  } catch (error) {
    console.error('Map tile proxy error:', error);
    return NextResponse.json({ 
      error: 'Error proxying map tile'
    }, { status: 500 });
  }
} 