import { NextRequest, NextResponse } from 'next/server';
import { propertyAnalysis } from '@/ai/flows/property-analysis';
import { searchRealEstateData } from '@/lib/search-utils';

/**
 * @swagger
 * /api/property-analysis:
 *   post:
 *     summary: Analyze property characteristics and market position
 *     description: Provides comprehensive property analysis with radar scores across 5 key categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - property_details
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: Property latitude coordinate
 *               longitude:
 *                 type: number
 *                 description: Property longitude coordinate
 *               property_details:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     description: Property type (e.g., nha_trong_hem, nha_pho)
 *                   landArea:
 *                     type: number
 *                     description: Land area in m²
 *                   houseArea:
 *                     type: number
 *                     description: House floor area in m²
 *                   bedRoom:
 *                     type: number
 *                     description: Number of bedrooms
 *                   bathRoom:
 *                     type: number
 *                     description: Number of bathrooms
 *                   storyNumber:
 *                     type: number
 *                     description: Number of stories
 *                   legal:
 *                     type: string
 *                     description: Legal status (e.g., red_book, pink_book)
 *               auth_token:
 *                 type: string
 *                 description: Authentication token
 *     responses:
 *       200:
 *         description: Successful property analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 property_analysis:
 *                   type: object
 *                   properties:
 *                     radarScore:
 *                       type: object
 *                       properties:
 *                         legalityScore:
 *                           type: number
 *                         liquidityScore:
 *                           type: number
 *                         locationScore:
 *                           type: number
 *                         evaluationScore:
 *                           type: number
 *                         dividendScore:
 *                           type: number
 *                         descriptions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Error processing analysis
 */
// Helper function to format market data for AI prompt
function formatMarketDataForAI(priceTrendData: any): string {
  if (!priceTrendData?.data || !Array.isArray(priceTrendData.data)) {
    return "Dữ liệu thị trường không khả dụng.";
  }

  const data = priceTrendData.data;
  const latest = data[data.length - 1];
  const earliest = data[0];
  
  const avgPrice = data.reduce((sum: number, item: any) => sum + item.price, 0) / data.length;
  const minPrice = Math.min(...data.map((item: any) => item.minPrice || item.price * 0.7 * 1000000));
  const maxPrice = Math.max(...data.map((item: any) => item.maxPrice || item.price * 1.3 * 1000000));
  
  const trend = latest.price > earliest.price ? "tăng" : "giảm";
  const trendPercent = Math.abs(((latest.price - earliest.price) / earliest.price) * 100).toFixed(1);

  return `
Dữ liệu thị trường bất động sản (${data.length} tháng gần nhất):
- Giá trung bình: ${avgPrice.toFixed(0)} triệu VND/m²
- Khoảng giá: ${(minPrice/1000000).toFixed(0)} - ${(maxPrice/1000000).toFixed(0)} triệu VND/m²
- Xu hướng: ${trend} ${trendPercent}% so với ${data.length} tháng trước
- Giá mới nhất (${latest.month}): ${latest.price} triệu VND/m²
- Số lượng giao dịch trung bình: ${(data.reduce((sum: number, item: any) => sum + (item.count ?? 0), 0) / data.length).toFixed(0)} giao dịch/tháng
- Nguồn dữ liệu: ${priceTrendData.source || 'API'}
- Chi tiết từng tháng: ${data.map((item: any) => `${item.month}: ${item.price}M VND/m² ( ${item.count ?? 'N/A'} giao dịch )`).join(', ')}
`.trim();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('\n🧠 =================');
    console.log('🧠 PROPERTY ANALYSIS AI');
    console.log('🧠 =================');

    const body = await request.json();
    console.log('📥 Input received:', JSON.stringify(body, null, 2));

    const { latitude, longitude, property_details, auth_token } = body;

    if (!latitude || !longitude) {
      console.log('❌ Missing coordinates');
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    console.log(`📍 Coordinates: ${latitude}, ${longitude}`);
    console.log(`🏠 Property details:`, property_details);

    // Step 1: Get location data directly (avoiding circular dependency)
    console.log('\n📋 STEP 1: Getting location data...');
    const step1Start = Date.now();

    // Get location info from coordinates
    const locationUrl = 'https://apis.resta.vn/erest-listing/features/location';
    const locationParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });

    const locationHeaders = {
      'accept-encoding': 'gzip',
      'host': 'apis.resta.vn',
      'user-agent': 'Dart/2.19 (dart:io)',
    };

    const locationResponse = await fetch(`${locationUrl}?${locationParams}`, {
      method: 'GET',
      headers: locationHeaders,
    });

    if (!locationResponse.ok) {
      console.log('❌ Location API failed');
      return NextResponse.json(
        { error: 'Cannot get location information from coordinates' },
        { status: 500 }
      );
    }

    const locationData = await locationResponse.json();
    
    // Parse location information
    const features = locationData?.features || [];
    if (!features.length) {
      return NextResponse.json(
        { error: 'Cannot parse location information' },
        { status: 404 }
      );
    }

    const mainFeature = features[0];
    const parsedAddress = {
      city: mainFeature?.c || '',
      district: mainFeature?.d || '',
      ward: mainFeature?.w || '',
      coordinates: mainFeature?.g || [],
      formatted_address: mainFeature?.dt || '',
      polygon: mainFeature?.polygon || [],
      bounding_box: mainFeature?.bb || [],
    };

    // Create valuation payload with defaults
    const defaultDetails = {
      type: 'town_house',
      landArea: 45.0,
      houseArea: 45.0,
      laneWidth: 10.0,
      facadeWidth: 4.0,
      storyNumber: 3.0,
      bedRoom: 2,
      bathRoom: 2,
      legal: 'pink_book',
      yearBuilt: 2015,
    };

    const mergedDetails = { ...defaultDetails, ...property_details };

    const valuationPayload = {
      address: {
        type: 'NORMAL',
        city: parsedAddress.city,
        district: parsedAddress.district,
        ward: parsedAddress.ward,
        administrativeLevel: 0,
      },
      bathRoom: mergedDetails.bathRoom,
      bedRoom: mergedDetails.bedRoom,
      geoLocation: [longitude, latitude],
      facadeWidth: mergedDetails.facadeWidth,
      hasGarden: mergedDetails.utilities?.hasGarden || false,
      houseArea: mergedDetails.houseArea,
      landArea: mergedDetails.landArea,
      laneWidth: mergedDetails.laneWidth,
      legal: mergedDetails.legal,
      storyNumber: mergedDetails.storyNumber,
      type: mergedDetails.type,
    };

    console.log('✅ Location data received and processed');
    console.log(`⏱️  Step 1 time: ${Date.now() - step1Start}ms`);

    // Step 2: Get market data from price trend
    console.log('\n📈 STEP 2: Getting market data...');
    const step2Start = Date.now();

    // Map property type to category
    const mapPropertyTypeToCategory = (type: string): string => {
      const categoryMap: Record<string, string> = {
        'apartment': 'chung_cu',
        'lane_house': 'nha_hem_ngo', 
        'town_house': 'nha_mat_pho',
        'land': 'ban_dat',
        'villa': 'biet_thu_lien_ke',
        'NORMAL': 'nha_mat_pho'
      };
      return categoryMap[type] || 'nha_mat_pho';
    };

    const category = mapPropertyTypeToCategory(valuationPayload.type || 'NORMAL');
    
    const priceTrendUrl = `${request.nextUrl.origin}/api/price-trend`;
    const priceTrendParams = new URLSearchParams({
      city: parsedAddress.city || 'ha_noi',
      district: parsedAddress.district || 'dong_da',
      category: category
    });

    const priceTrendResponse = await fetch(`${priceTrendUrl}?${priceTrendParams}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    let marketData = "Không có dữ liệu thị trường cho khu vực này.";
    if (priceTrendResponse.ok) {
      const priceTrendData = await priceTrendResponse.json();
      // Check if price trend API actually has data
      if (priceTrendData.success && priceTrendData.data && priceTrendData.data.length > 0) {
        marketData = formatMarketDataForAI(priceTrendData);
        console.log('✅ Market data received');
      } else {
        console.log('⚠️  Price trend API returned no data');
        marketData = "Không có dữ liệu thị trường cho khu vực này.";
      }
    } else {
      console.log('⚠️  Price trend API failed');
      marketData = "Không có dữ liệu thị trường cho khu vực này.";
    }

    console.log(`⏱️  Step 2 time: ${Date.now() - step2Start}ms`);

    // Step 1.5: Reverse geocode to get street name
    console.log('\n🛣️ STEP 1.5: Reverse geocoding to get street name...');
    let streetName = '';
    try {
      const geoapifyUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${process.env.GEOAPIFY_API_KEY}`;
      const geoapifyRes = await fetch(geoapifyUrl, { headers: { 'User-Agent': 'studio-bds/1.0' } });
    
      if (geoapifyRes.ok) {
        const geoapifyData = await geoapifyRes.json();
        if (geoapifyData.results && geoapifyData.results.length > 0) {
          const address = geoapifyData.results[0];
          streetName = address.street || '';
          console.log('🛣️  Street name from Geoapify:', streetName);
        } else {
          console.log('⚠️  No results from Geoapify');
        }
      } else {
        console.log('⚠️  Geoapify reverse geocoding failed');
      }
    } catch (err) {
      console.log('⚠️  Geoapify error:', err);
    }

    // Step 2.5: Get search data from internet
    console.log('\n🔍 STEP 2.5: Getting search data from internet...');
    const step2_5Start = Date.now();

    const locationString = `${parsedAddress.ward}, ${parsedAddress.district}, ${parsedAddress.city}`;
    let searchData = '';
    
    try {
      searchData = await searchRealEstateData(locationString, parsedAddress, property_details, streetName);
      if (searchData) {
        console.log('✅ Search data received from internet');
      } else {
        console.log('⚠️  No relevant search data found');
        searchData = 'Không có dữ liệu search phù hợp từ internet.';
      }
    } catch (error) {
      console.log('⚠️  Search API failed, using fallback');
      searchData = 'Không thể truy cập dữ liệu search từ internet.';
    }

    console.log(`⏱️  Step 2.5 time: ${Date.now() - step2_5Start}ms`);

    // Step 3: Prepare AI input
    console.log('\n🤖 STEP 3: Preparing AI analysis input...');
    const step3Start = Date.now();

    // Get amenities from mergedDetails (if coming from complete-flow with utilities)
    const amenities = mergedDetails.amenities || mergedDetails.combinedAmenities || [];

    const aiInput = {
      address: parsedAddress.formatted_address || '',
      city: parsedAddress.city || 'ha_noi',
      district: parsedAddress.district || 'dong_da', 
      ward: parsedAddress.ward || 'unknown',
      administrativeLevel: 0,
      type: valuationPayload.type || 'NORMAL',
      size: valuationPayload.houseArea || 45,
      bedrooms: valuationPayload.bedRoom || 2,
      bathrooms: valuationPayload.bathRoom || 2,
      lotSize: valuationPayload.landArea || 45,
      landArea: valuationPayload.landArea || 45,
      houseArea: valuationPayload.houseArea || 45,
      laneWidth: valuationPayload.laneWidth || 3,
      facadeWidth: valuationPayload.facadeWidth || 3,
      amenities: amenities, // Use amenities from utilities data
      storyNumber: valuationPayload.storyNumber || 3,
      legal: valuationPayload.legal || 'contract',
      yearBuilt: mergedDetails.yearBuilt || 2015,
      marketData: marketData,
      searchData: searchData,
    };

    console.log('📊 AI Input:', JSON.stringify(aiInput, null, 2));
    console.log(`⏱️  Step 3 time: ${Date.now() - step3Start}ms`);

    // Step 4: Call AI analysis
    console.log('\n🧠 STEP 4: Running AI property analysis...');
    const step4Start = Date.now();

    const aiResult = await propertyAnalysis(aiInput);
    
    console.log('✅ AI Analysis completed');
    console.log('🎯 AI Output:', JSON.stringify(aiResult, null, 2));
    console.log(`⏱️  Step 4 time: ${Date.now() - step4Start}ms`);

    // Final result
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total execution time: ${totalTime}ms`);
    console.log('🧠 =================');

    return NextResponse.json({
      success: true,
      result: aiResult,
      input_data: {
        coordinates: [latitude, longitude],
        property_details: property_details,
        parsed_address: parsedAddress,
        valuation_payload: valuationPayload,
      },
      ai_input: aiInput,
      performance: {
        total_time: totalTime,
        step_times: {
          location_data: Date.now() - step1Start,
          market_data: Date.now() - step2Start,
          search_data: Date.now() - step2_5Start, 
          ai_preparation: Date.now() - step3Start,
          ai_analysis: Date.now() - step4Start
        }
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Property Analysis API Error:', error);
    console.log(`⏱️  Error after: ${totalTime}ms`);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { total_time: totalTime }
      },
      { status: 500 }
    );
  }
} 