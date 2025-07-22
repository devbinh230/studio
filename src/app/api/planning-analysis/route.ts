import { NextRequest, NextResponse } from 'next/server';
import { planningAnalysis } from '@/ai/flows/planning-analysis';
import { preparePlanningAnalysisData, generateAIPlanningImageUrl } from '@/lib/planning-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Case 1: Coordinates provided
    if (body.lat && body.lng) {
      console.log(`📍 Preparing planning analysis for coordinates: ${body.lat}, ${body.lng}`);
      
      // Generate a single image URL directly to avoid any issues with arrays
      const imageUrl = generateAIPlanningImageUrl(Number(body.lat), Number(body.lng), 18);
      
      // Get planning data for land info
      const apiUrl = new URL('/api/guland-proxy/planning', request.url);
      const planningResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          marker_lat: Number(body.lat), 
          marker_lng: Number(body.lng),
          province_id: 1 // Assuming Hanoi
        }),
      });
      
      let landInfo = `Location: ${body.lat}, ${body.lng}\nNo detailed planning information available.`;
      
      if (planningResponse.ok) {
        const planningData = await planningResponse.json();
        if (planningData.success && planningData.data?.html) {
          // Extract land info from HTML using a simple approach
          const html = planningData.data.html;
          
          // Simple text extraction
          landInfo = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
      
      console.log('🖼️ Using image URL:', imageUrl);
      console.log('📄 Land info length:', landInfo.length);
      
      // Run planning analysis with direct URL
      const result = await planningAnalysis({
        imagePath: imageUrl,
        landInfo: landInfo
      });
      
      return NextResponse.json({
        success: true,
        data: result
      });
    }
    // Case 2: Direct image path and land info provided
    else if (body.imagePath && body.landInfo) {
      // Ensure imagePath is a string
      const imagePath = typeof body.imagePath === 'string' 
        ? body.imagePath 
        : Array.isArray(body.imagePath) && body.imagePath.length > 0
          ? body.imagePath[0] 
          : null;
          
      if (!imagePath) {
        throw new Error('Invalid image path format');
      }
      
      console.log('🖼️ Using provided image URL/data:', 
        imagePath.startsWith('data:') ? 'Data URL (base64)' : imagePath);
      
      // Run planning analysis
      const result = await planningAnalysis({
        imagePath: imagePath,
        landInfo: body.landInfo
      });
      
      return NextResponse.json({
        success: true,
        data: result
      });
    }
    // Invalid request
    else {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameters: Either provide lat/lng or imagePath/landInfo" 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in planning analysis API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Unknown error in planning analysis"
      }, 
      { status: 500 }
    );
  }
} 