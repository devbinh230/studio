import { NextRequest, NextResponse } from 'next/server';
import { propertyValuationRange } from '@/ai/flows/property-valuation';
import { searchRealEstateData } from '@/lib/search-utils';
import fs from 'fs';
import path from 'path';

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
    console.log('\n💰 =================');
    console.log('💰 PROPERTY VALUATION AI');
    console.log('💰 =================');

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
      laneWidth: 3.0, // FIXED: Changed from 10.0 to 3.0 to match ai-combined
      facadeWidth: 4.0,
      storyNumber: 3.0,
      bedRoom: 2,
      bathRoom: 2,
      legal: 'pink_book',
      yearBuilt: 2015,
      // FIXED: Added missing fields to match ai-combined
      alleyType: 'thong',
      houseDirection: 'nam',
      soShape: 'vuong',
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
        console.log('📊 Market data summary:', priceTrendData);
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
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const nominatimRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'studio-bds/1.0' } });
      if (nominatimRes.ok) {
        const nominatimData = await nominatimRes.json();
        streetName = nominatimData.address?.road || nominatimData.address?.pedestrian || nominatimData.address?.footway || '';
        console.log('🛣️  Street name from Nominatim:', streetName);
      } else {
        console.log('⚠️  Nominatim reverse geocoding failed');
      }
    } catch (err) {
      console.log('⚠️  Nominatim error:', err);
    }

    // Step 2.5: Get search data from internet
    console.log('\n🔍 STEP 2.5: Getting search data from internet...');
    const step2_5Start = Date.now();

    const locationString = `${parsedAddress.ward}, ${parsedAddress.district}, ${parsedAddress.city}`;
    let searchData = '';
    
    try {
      console.log('🔍 Starting search with params:', {
        locationString,
        streetName,
        propertyType: property_details?.type,
        landArea: property_details?.landArea
      });
      
      searchData = await searchRealEstateData(locationString, parsedAddress, property_details, streetName);
      if (searchData) {
        console.log('✅ Search data received from internet');
        console.log('📄 Search data length:', searchData.length);
      } else {
        console.log('⚠️  No relevant search data found');
        searchData = 'Không có dữ liệu search phù hợp từ internet.';
      }
    } catch (error) {
      console.log('⚠️  Search API failed, using fallback');
      console.error('Search API error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      searchData = 'Không thể truy cập dữ liệu search từ internet.';
    }

    console.log(`⏱️  Step 2.5 time: ${Date.now() - step2_5Start}ms`);

    // Step 1.6: Find price_gov from output.json
    function normalizeStreetName(name: string): string {
      if (!name) return '';
      let n = name.toLowerCase().replace(/^(đường|pho|phố|duong|street)\s+/g, '');
      n = n.replace('quan_', '')
      n = n.replace(/đ/g, 'd').replace(/Đ/g, 'D');
      n = n.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      n = n.replace(/\s+/g, ' ').trim();
      return n;
    }
    function normalizeDistrictName(name: string): string {
      if (!name) return '';
      let n = name.toLowerCase().replace(/^(quận|huyện|thành phố)\s+/g, '');
      n = n.replace(/_/g, ' ');
      n = n.replace(/đ/g, 'd').replace(/Đ/g, 'D');
      n = n.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      n = n.replace(/\s+/g, ' ').trim();
      return n;
    }
    let price_gov = '';
    if (streetName && parsedAddress.district) {
      try {
        const outputPath = path.join(process.cwd(), 'price_gov.json');
        const outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const queryNorm = normalizeStreetName(streetName);
        // Bước 1: Lọc theo tên đường
        const streetMatches = outputData.filter((item: any) => {
          const streetNorm = normalizeStreetName(item['Đường']);
          // So sánh includes cả hai chiều
          return (streetNorm === queryNorm || streetNorm.includes(queryNorm) || queryNorm.includes(streetNorm));
        });
        if (streetMatches.length === 0) {
          console.log('⚠️  Không tìm thấy tên đường phù hợp:', queryNorm);
        } else {
          // Bước 2: Lọc theo tên quận
          const queryDistrictNorm = normalizeDistrictName(parsedAddress.district);
          const found = streetMatches.find((item: any) => {
            const districtNorm = normalizeDistrictName(item['Quận']);
            // Log for debug
            console.log('So sánh quận:', {queryDistrictNorm, districtNorm});
            return districtNorm === queryDistrictNorm;
          });
          if (found) {
            console.log('💰 JSON price_gov object:', found);
            price_gov = JSON.stringify(found);
            console.log('💰 Found price_gov:', price_gov);
          } else {
            console.log('⚠️  Không tìm thấy quận phù hợp sau khi đã khớp tên đường:', queryDistrictNorm);
          }
        }
      } catch (err) {
        console.log('⚠️  Error reading price_gov.json:', err);
      }
    }

    // Step 3: Prepare AI input
    console.log('\n🤖 STEP 3: Preparing AI valuation input...');
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
      lotSize: valuationPayload.landArea || 45,
      landArea: valuationPayload.landArea || 45,
      houseArea: valuationPayload.houseArea || 45,
      laneWidth: valuationPayload.laneWidth || 3,
      facadeWidth: valuationPayload.facadeWidth || 3,
      storyNumber: valuationPayload.storyNumber || 3,
      bedrooms: valuationPayload.bedRoom || 2,
      bathrooms: valuationPayload.bathRoom || 2,
      legal: valuationPayload.legal || 'contract',
      amenities: amenities, // Use amenities from utilities data
      yearBuilt: mergedDetails.yearBuilt || 2015,
      marketData: marketData,
      searchData: searchData,
      price_gov: price_gov,
      // FIXED: Added missing fields that affect price calculation
      alleyType: mergedDetails.alleyType || 'thong',
      houseDirection: mergedDetails.houseDirection || 'nam',
      soShape: mergedDetails.soShape || 'vuong',
    };

    console.log('📊 AI Input (formatted):', JSON.stringify(aiInput, null, 2));
    console.log('🔍 AI Input (raw JSON for debug):', JSON.stringify(aiInput));
    console.log('📏 AI Input size:', JSON.stringify(aiInput).length, 'characters');
    console.log(`⏱️  Step 3 time: ${Date.now() - step3Start}ms`);

    // Step 4: Call AI valuation
    console.log('\n💰 STEP 4: Running AI property valuation...');
    const step4Start = Date.now();

    const aiResult = await propertyValuationRange(aiInput);
    
    console.log('✅ AI Valuation completed');
    console.log('💰 AI Output:', JSON.stringify(aiResult, null, 2));
    console.log(`⏱️  Step 4 time: ${Date.now() - step4Start}ms`);

    // Step 5: Format result with additional info
    console.log('\n📋 STEP 5: Formatting final result...');
    const step5Start = Date.now();

    const formattedResult = {
      valuation: aiResult,
      property_info: {
        address: parsedAddress.formatted_address,
        location: {
          city: parsedAddress.city,
          district: parsedAddress.district,
          ward: parsedAddress.ward,
        },
        specifications: {
          type: valuationPayload.type,
          land_area: valuationPayload.landArea,
          house_area: valuationPayload.houseArea,
          bedrooms: valuationPayload.bedRoom,
          bathrooms: valuationPayload.bathRoom,
          lane_width: valuationPayload.laneWidth,
          facade_width: valuationPayload.facadeWidth,
          story_number: valuationPayload.storyNumber,
          legal: valuationPayload.legal,
          year_built: mergedDetails.yearBuilt,
        }
      },
      market_context: {
        category: category,
        data_source: priceTrendResponse.ok ? 'API' : 'fallback',
      }
    };

    console.log(`⏱️  Step 5 time: ${Date.now() - step5Start}ms`);

    // Final result
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total execution time: ${totalTime}ms`);
    console.log('💰 =================');

    return NextResponse.json({
      success: true,
      result: formattedResult,
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
          ai_valuation: Date.now() - step4Start,
          formatting: Date.now() - step5Start
        }
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Property Valuation API Error:', error);
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