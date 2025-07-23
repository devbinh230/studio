"use server";

import { NextRequest, NextResponse } from 'next/server';
import { generateAIPlanningImageUrl, capturePlanningImages } from '@/lib/planning-utils';
import fs from 'fs';
import path from 'path';
import { GULAND_CONFIG } from '@/lib/config';

/**
 * @swagger
 * /api/planning-capture:
 *   post:
 *     summary: Capture planning map images based on coordinates and process with external API
 *     description: |
 *       Takes latitude and longitude coordinates as input, returns tile URLs, boundary polygon data, and also calls an external process-map API for further processing. 
 *       
 *       **Note:** This endpoint will forward the generated planning data to an external API (`process-map`) with Bearer authentication (token from server config) and return the result as `processMapResult`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *             properties:
 *               lat:
 *                 type: number
 *                 description: Latitude of the location to capture
 *               lng:
 *                 type: number
 *                 description: Longitude of the location to capture
 *               zoom:
 *                 type: integer
 *                 minimum: 10
 *                 maximum: 18
 *                 default: 18
 *                 description: Zoom level for the capture (10-18)
 *               useMosaic:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to use mosaic mode for image capture
 *               mapType:
 *                 type: string
 *                 enum: [qh2030, qh500, qhPK]
 *                 default: qh2030
 *                 description: Map type to use for the composite image
 *     responses:
 *       200:
 *         description: Successfully captured planning map image data and processed with external API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       description: URL of the primary planning image
 *                     qh2030:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of QH2030 tile URLs
 *                     qh500:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of QH500 tile URLs
 *                     qhPK:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of QHPK tile URLs
 *                     tileCoordinates:
 *                       type: object
 *                       description: Information about tile coordinates for the client to use
 *                     boundingBox:
 *                       type: object
 *                       description: Bounding box of the polygon points
 *                     polygon:
 *                       type: array
 *                       description: Array of polygon points (lat/lng)
 *                     address:
 *                       type: string
 *                       description: Address of the property (if available)
 *                     planningData:
 *                       type: object
 *                       description: Raw planning data from the planning API
 *                 processMapResult:
 *                   type: object
 *                   description: Result returned from the external process-map API
 *       400:
 *         description: Bad request (missing or invalid parameters)
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid JSON in request body" 
      }, { status: 400 });
    }
    
    // Validate required parameters
    if (!body.lat || !body.lng) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameters: lat and lng are required" 
      }, { status: 400 });
    }
    
    // Parse parameters
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const zoom = Math.min(18, Math.max(10, Number(body.zoom || 18))); // Ensure zoom is between 10-18
    const useMosaic = body.useMosaic !== false; // Default to true
    const mapType = body.mapType || 'qh2030'; // Default to qh2030
    
    console.log(`📍 Capturing planning image data for coordinates: ${lat}, ${lng}, zoom: ${zoom}, useMosaic: ${useMosaic}, mapType: ${mapType}`);
    
    // Generate primary image URL for AI analysis
    const imageUrl = generateAIPlanningImageUrl(lat, lng, zoom);
    
    // Capture planning images (mosaic or single tiles)
    const captureResult = await capturePlanningImages(lat, lng, {
      zoom,
      useMosaic
    });
    
    // Initialize variables for the processed data
    let boundingBox = null;
    let address = null;
    let polygon = null;
    
    // Get polygon points from planning API
    let planningData = null;
    
    try {
      console.log('Fetching planning data for polygon points...');
      const planningResponse = await fetch(`${request.nextUrl.origin}/api/guland-proxy/planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marker_lat: lat, marker_lng: lng, province_id: 1 }),
      });
      
      if (planningResponse.ok) {
        planningData = await planningResponse.json();
        
        if (planningData?.success && planningData.data?.points?.length > 0) {
          polygon = planningData.data.points;
          address = planningData.data.address || null;
          
          // Calculate bounding box of polygon points
          boundingBox = polygon.reduce((bbox: {north: number, south: number, east: number, west: number}, point: {lat: number, lng: number}) => {
            return {
              north: Math.max(bbox.north, point.lat),
              south: Math.min(bbox.south, point.lat),
              east: Math.max(bbox.east, point.lng),
              west: Math.min(bbox.west, point.lng)
            };
          }, { north: -90, south: 90, east: -180, west: 180 });
          
          console.log(`📐 Found ${polygon.length} polygon points, bounding box:`, boundingBox);
        } else {
          console.log('No polygon points found in planning data');
        }
      }
    } catch (planningError) {
      console.error('Error fetching planning data:', planningError);
    }
    
    // Extract tile coordinates from the first URL for the client to use in rendering
    let tileCoordinates = null;
    if (captureResult && typeof captureResult === 'object') {
      const tileUrls = captureResult[mapType as keyof typeof captureResult];
      
      if (Array.isArray(tileUrls) && tileUrls.length > 0) {
        const firstTileUrl = tileUrls[0];
        const tileRegex = /\/(\d+)\/(\d+)\/(\d+)\.png$/;
        const tileMatch = firstTileUrl.match(tileRegex);
        
        if (tileMatch) {
          tileCoordinates = {
            z: parseInt(tileMatch[1]),
            x: parseInt(tileMatch[2]),
            y: parseInt(tileMatch[3]),
            tileSize: 256,
            gridSize: Math.floor(Math.sqrt(tileUrls.length))
          };
        }
      }
    }
    
    // Return combined results
    const responseData = {
      success: true,
      data: {
        imageUrl,
        ...captureResult,
        tileCoordinates,
        boundingBox,
        polygon,
        address,
        planningData: planningData?.data || null
      }
    };

    // Chuẩn hóa payload cho process-map, thêm expires_minutes
    const processMapPayload = {
      data: responseData.data,
      expires_minutes: 10
    };

    // --- Sửa lỗi URL process-map ---
    // Đảm bảo SERVER_URL có http/https
    let processMapUrl = `${GULAND_CONFIG.SERVER_URL}${GULAND_CONFIG.ENDPOINTS.PROCESS_MAP}`;
    if (!/^https?:\/\//i.test(GULAND_CONFIG.SERVER_URL)) {
      // Nếu thiếu http/https, báo lỗi rõ ràng
      return NextResponse.json({
        success: false,
        error: `GULAND_CONFIG.SERVER_URL is invalid: ${GULAND_CONFIG.SERVER_URL}. Must start with http:// or https://`
      }, { status: 500 });
    }
    console.log('🌐 Calling process-map API at:', processMapUrl);
    // --- End sửa lỗi URL ---

    let processMapResult = null;
    try {
      const processMapRes = await fetch(processMapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(GULAND_CONFIG.AUTH_TOKEN ? { 'Authorization': `Bearer ${GULAND_CONFIG.AUTH_TOKEN}` } : {})
        },
        body: JSON.stringify(processMapPayload)
      });
      if (processMapRes.ok) {
        processMapResult = await processMapRes.json();
      } else {
        processMapResult = { success: false, error: 'Failed to process map', status: processMapRes.status };
      }
    } catch (err) {
      processMapResult = { success: false, error: 'Error calling process-map API', details: (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err) };
    }

    return NextResponse.json({
      ...responseData,
      ...(processMapResult && typeof processMapResult === 'object' ? processMapResult : {})
    });
    
  } catch (error: any) {
    console.error('Error in planning capture API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Unknown error in planning capture"
      }, 
      { status: 500 }
    );
  }
} 