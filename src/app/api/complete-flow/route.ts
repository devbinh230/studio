import { NextRequest, NextResponse } from 'next/server';
import { getDistanceAnalysis } from '@/lib/distance-utils';
import { mergeDetailsWithUtilities } from '@/lib/utils';
import fs from 'fs';
import path from 'path';
import { searchRealEstateData, searchRealEstateDataEnhanced } from '@/lib/search-utils';

// Helper function to format currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

interface PropertyDetails {
  type?: string;
  landArea?: number;
  houseArea?: number;
  laneWidth?: number;
  facadeWidth?: number;
  storyNumber?: number;
  bedRoom?: number;
  bathRoom?: number;
  legal?: string;
  yearBuilt?: number;
  alleyType?: string;
  houseDirection?: string;
  utilities?: any;
  strengths?: any;
  weaknesses?: any;
  soShape?: string;
}

// Helper function to format market data for AI prompt
function formatMarketDataForAI(priceTrendData: any): string {
  if (!priceTrendData?.success || !priceTrendData?.data || priceTrendData.data.length === 0) {
    return "Không có dữ liệu thị trường cho khu vực này.";
  }

  const data = priceTrendData.data;
  const latest = data[data.length - 1];
  const earliest = data[0];
  
  const avgPrice = data.reduce((sum: number, item: any) => sum + item.price, 0) / data.length;
  const minPrice = Math.min(...data.map((item: any) => item.minPrice || item.price * 0.7));
  const maxPrice = Math.max(...data.map((item: any) => item.maxPrice || item.price * 1.3));
  
  const trend = latest.price > earliest.price ? "tăng" : "giảm";
  const trendPercent = Math.abs(((latest.price - earliest.price) / earliest.price) * 100).toFixed(1);

  return `
Dữ liệu thị trường bất động sản (${data.length} tháng gần nhất):
- Giá trung bình: ${avgPrice.toFixed(0)} triệu VND/m²
- Khoảng giá: ${minPrice.toFixed(0)} - ${maxPrice.toFixed(0)} triệu VND/m²
- Xu hướng: ${trend} ${trendPercent}% so với ${data.length} tháng trước
- Giá mới nhất (${latest.month}): ${latest.price} triệu VND/m²
- Số lượng giao dịch trung bình: ${(data.reduce((sum: number, item: any) => sum + (item.count ?? 0), 0) / data.length).toFixed(0)} giao dịch/tháng
- Chi tiết từng tháng: ${data.map((item: any) => `${item.month}: ${item.price}M VND/m² (${item.count ?? 'N/A'} giao dịch)`).join(', ')}
  `.trim();
}
          
/**
 * @swagger
 * /api/complete-flow:
 *   post:
 *     summary: Complete property valuation flow
 *     description: Processes property details and returns valuation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               property_details:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, property_details, auth_token, cafelandAvg } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (!auth_token) {
      return NextResponse.json(
        { error: 'Auth token is required' },
        { status: 400 }
      );
    }

    console.log('🚀 STARTING SUPER-OPTIMIZED REAL ESTATE VALUATION FLOW');
    console.log('='.repeat(60));

    const result: {
      input_coordinates: [number, number];
      location_info: any;
      parsed_address: any;
      address: any; // Thêm address object cho component compatibility
      location_details: any; // Thêm location_details cho comprehensive location info
      valuation_payload: any;
      valuation_result: any;
      utilities: any;
      price_trend: any;
      ai_valuation: any;
      ai_analysis: any;
      distance_analysis: any;
      price_gov_data: any; // Bổ sung dữ liệu bảng giá nhà nước
      ai_real_estate_data: any; // Thêm AI real estate data từ search
      search_sources: string[]; // Thêm sources từ AI search
      success: boolean;
      error: string | null;
      performance: {
        total_time: number;
        step_times: Record<string, number>;
      };
      planning_analysis?: any; // Thêm trường cho phân tích kế hoạch
    } = {
      input_coordinates: [latitude, longitude],
      location_info: null,
      parsed_address: null,
      address: null, // Initialize address object
      location_details: null, // Initialize location_details
      valuation_payload: null,
      valuation_result: null,
      utilities: null,
      price_trend: null,
      ai_valuation: null,
      ai_analysis: null,
      distance_analysis: null,
      ai_real_estate_data: null, // Initialize AI real estate data
      search_sources: [], // Initialize search sources
      price_gov_data: null, // Initialize price_gov_data
      success: false,
      error: null,
      performance: {
        total_time: 0,
        step_times: {}
      },
      planning_analysis: undefined // Initialize planning_analysis
    };

    const startTime = Date.now();

    // Step 1: Get location info from coordinates (Required first)
    console.log('\n📍 STEP 1: Getting location information');
    const step1Start = Date.now();
    
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

    let locationData;
    try {
      const locationResponse = await fetch(`${locationUrl}?${locationParams}`, {
        method: 'GET',
        headers: locationHeaders,
      });

      if (locationResponse.ok) {
        locationData = await locationResponse.json();
        result.location_info = locationData;
        console.log('✅ Location API successful');
      } else {
        console.log('⚠️  Location API failed, using fallback');
        locationData = { features: [] }; // Empty features to trigger fallback
        result.location_info = { error: `Location API failed with status ${locationResponse.status}` };
      }
    } catch (error) {
      console.log('⚠️  Location API exception, using fallback:', error);
      locationData = { features: [] }; // Empty features to trigger fallback
      result.location_info = { error: `Location API exception: ${error}` };
    }

    // Step 2: Parse location information (Required for next steps)
    console.log('\n🔄 STEP 2: Parsing location information');
    const features = locationData?.features || [];
    
    let parsedAddress;
    if (!features.length) {
      console.log('⚠️  No features found, using fallback location data');
      // Fallback với tọa độ Hà Nội
      parsedAddress = {
        city: 'ha_noi',
        district: 'dong_da',
        ward: 'phuong_trung_liet',
        coordinates: [longitude, latitude],
        formatted_address: `${latitude}, ${longitude}`,
        polygon: [],
        bounding_box: [],
      };
    } else {
      const mainFeature = features[0];
      parsedAddress = {
        city: mainFeature?.c || 'ha_noi',
        district: mainFeature?.d || 'dong_da',
        ward: mainFeature?.w || 'phuong_trung_liet',
        coordinates: mainFeature?.g || [longitude, latitude],
        formatted_address: mainFeature?.dt || `${latitude}, ${longitude}`,
        polygon: mainFeature?.polygon || [],
        bounding_box: mainFeature?.bb || [],
      };
    }

    result.parsed_address = parsedAddress;
    
    // Populate address object for component compatibility
    result.address = {
      city: parsedAddress.city,
      district: parsedAddress.district,
      ward: parsedAddress.ward,
      formatted_address: parsedAddress.formatted_address,
      coordinates: parsedAddress.coordinates
    };
    
    // Populate comprehensive location details
    result.location_details = {
      full_address: parsedAddress.formatted_address,
      display_address: parsedAddress.formatted_address || `${latitude}, ${longitude}`,
      administrative: {
        city: parsedAddress.city,
        city_name: parsedAddress.city,
        city_display_name: parsedAddress.city.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        district: parsedAddress.district,
        district_name: parsedAddress.district,
        district_display_name: parsedAddress.district.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        ward: parsedAddress.ward,
        ward_name: parsedAddress.ward,
        ward_display_name: parsedAddress.ward.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        administrative_level: 0
      },
      coordinates: {
        latitude: latitude,
        longitude: longitude,
        coordinate_pair: parsedAddress.coordinates,
        precision: features.length > 0 ? 'high' : 'fallback'
      },
      geometry: {
        polygon: parsedAddress.polygon,
        bounding_box: parsedAddress.bounding_box,
        has_polygon: parsedAddress.polygon && parsedAddress.polygon.length > 0,
        has_bbox: parsedAddress.bounding_box && parsedAddress.bounding_box.length > 0
      },
      status: {
        location_found: features.length > 0,
        api_success: locationData && !locationData.error,
        fallback_used: features.length === 0,
        confidence: features.length > 0 ? 'high' : 'low'
      },
      source: {
        api_response: locationData,
        feature_used: features.length > 0 ? features[0] : null,
        total_features: features.length,
        timestamp: new Date().toISOString(),
        source_type: 'resta_api'
      },
      metadata: {
        input_coordinates: [latitude, longitude],
        parsed_at: new Date().toISOString(),
        region: 'vietnam',
        language: 'vi'
      }
    };
    
    result.performance.step_times.location_and_parsing = Date.now() - step1Start;

    console.log(`📍 Parsed address: ${parsedAddress.formatted_address}`);
    console.log(`🏘️  City: ${parsedAddress.city}`);
    console.log(`🏙️  District: ${parsedAddress.district}`);
    console.log(`🏡 Ward: ${parsedAddress.ward}`);

    // Step 3: Create valuation payload
    console.log('\n📋 STEP 3: Creating valuation payload');
    const defaultDetails: PropertyDetails = {
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
      alleyType: 'thong',
      houseDirection: 'nam',
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
      yearBuilt: mergedDetails.yearBuilt,
      alleyType: mergedDetails.alleyType,
      houseDirection: mergedDetails.houseDirection,
      soShape: mergedDetails.soShape,
    };

    result.valuation_payload = valuationPayload;

    // Map property type to API category
    const mapPropertyTypeToCategory = (type: string): string => {
      const categoryMap: Record<string, string> = {
        'apartment': 'chung_cu',
        'lane_house': 'nha_hem_ngo', 
        'town_house': 'nha_mat_pho',
        'land': 'ban_dat',
        'villa': 'biet_thu_lien_ke'
      };
      return categoryMap[type] || 'nha_mat_pho';
    };

    // OPTIMIZED PARALLEL EXECUTION: Steps 4-7 run concurrently with shared data
    console.log('\n🚀 EXECUTING SUPER-OPTIMIZED PARALLEL CALLS (Steps 4-7)');
    const parallelStart = Date.now();

    // Define all parallel tasks with shared data to eliminate duplicate calls
    const parallelTasks = [
      // Task 1: Utilities API
      (async () => {
        console.log('🏪 [PARALLEL] Starting utilities API...');
        try {
          const utilityTypes = ['hospital', 'market', 'restaurant', 'cafe', 'supermarket', 'commercial_center'];
          const utilitiesUrl = `${request.nextUrl.origin}/api/utilities`;
          const utilitiesParams = new URLSearchParams({
            lat: latitude.toString(),
            lng: longitude.toString(),
            distance: '5',
            size: '10',
          });

          const utilitiesResponse = await fetch(`${utilitiesUrl}?${utilitiesParams}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'EstateValuate/1.0',
            },
          });

          if (utilitiesResponse.ok) {
            const utilitiesResult = await utilitiesResponse.json();
            
            const groupedUtilities = utilityTypes.reduce((acc, type) => {
              acc[type] = utilitiesResult.data?.filter((utility: any) => utility.type === type) || [];
              return acc;
            }, {} as Record<string, any[]>);

            console.log('✅ [PARALLEL] Utilities API completed with', utilitiesResult.data?.length || 0, 'items');
            return {
              type: 'utilities',
              data: {
                total: utilitiesResult.total || 0,
                data: utilitiesResult.data || [],
                groupedData: groupedUtilities,
              },
              success: true
            };
          } else {
            const errorText = await utilitiesResponse.text();
            console.log('⚠️  [PARALLEL] Utilities API failed:', utilitiesResponse.status, errorText);
            return { type: 'utilities', data: null, success: false, error: `Status ${utilitiesResponse.status}: ${errorText}` };
          }
        } catch (error) {
          console.error('❌ [PARALLEL] Utilities error:', error);
          return { type: 'utilities', data: null, success: false, error: `Exception: ${error}` };
        }
      })(),

      // Task 2: Price Trend API
      (async () => {
        console.log('📈 [PARALLEL] Starting price trend API...');
        try {
          const trendParams = new URLSearchParams({
            city: parsedAddress.city,
            district: parsedAddress.district,
            category: mapPropertyTypeToCategory(mergedDetails.type || 'town_house')
          });
          
          const trendUrl = `${request.nextUrl.origin}/api/price-trend?${trendParams}`;
          const trendResponse = await fetch(trendUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });

          if (trendResponse.ok) {
            const trendResult = await trendResponse.json();
            console.log('✅ [PARALLEL] Price trend API completed');
            return {
              type: 'price_trend',
              data: trendResult,
              success: true
            };
          } else {
            console.log('⚠️  [PARALLEL] Price trend API failed');
            return {
              type: 'price_trend',
              data: { success: false, error: `API returned status ${trendResponse.status}` },
              success: false
            };
          }
        } catch (error) {
          console.error('❌ [PARALLEL] Price trend error:', error);
          return {
            type: 'price_trend',
            data: { success: false, error: `Error occurred: ${error}` },
            success: false
          };
        }
      })(),

      // Task 3: Distance Analysis
      (async () => {
        console.log('📏 [PARALLEL] Starting distance analysis...');
        try {
          const distanceAnalysis = await getDistanceAnalysis(
            latitude,
            longitude,
            parsedAddress.formatted_address
          );
          
          console.log('✅ [PARALLEL] Distance analysis completed');
          console.log(`📏 Distance to city center: ${distanceAnalysis.distances.toCityCenter?.distance || 'N/A'} km`);
          console.log(`📏 Distance to district center: ${distanceAnalysis.distances.toDistrictCenter?.distance || 'N/A'} km`);
          console.log(`📏 Accessibility rating: ${distanceAnalysis.analysis.accessibility}`);
          
          return { 
            type: 'distance_analysis', 
            data: distanceAnalysis, 
            success: true 
          };
        } catch (error) {
          console.error('❌ [PARALLEL] Distance analysis error:', error);
          return { 
            type: 'distance_analysis', 
            data: null, 
            success: false, 
            error: `Distance analysis error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      })(),

      // Task 4: SINGLE Search Data Call (Eliminates duplicate calls in AI functions)
      (async () => {
        console.log('🔍 [PARALLEL] Starting SINGLE search data call...');
        try {
          // Get street name for better search accuracy
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

          // Add price_gov lookup logic
          let price_gov = '';
          if (streetName && parsedAddress.district) {
            try {
              const outputPath = path.join(process.cwd(), 'price_gov.json');
              const outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
              
              function normalizeStreetName(name: string): string {
                if (!name) return '';
                let n = name.toLowerCase().replace(/^(đường|pho|phố|duong|street)\s+/g, '');
                n = n.replace(/đ/g, 'd').replace(/Đ/g, 'D');
                n = n.normalize('NFD').replace(/\p{Diacritic}/gu, '');
                n = n.replace(/\s+/g, ' ').trim();
                return n;
              }

              function normalizeDistrictName(name: string): string {
                if (!name) return '';
                let n = name.toLowerCase().replace(/^(quận|huyện|thành phố)\s+/g, '');
                n = n.replace('quan_', '')
                n = n.replace(/_/g, ' ');
                n = n.replace(/đ/g, 'd').replace(/Đ/g, 'D');
                n = n.normalize('NFD').replace(/\p{Diacritic}/gu, '');
                n = n.replace(/\s+/g, ' ').trim();
                return n;
              }

              const queryNorm = normalizeStreetName(streetName);
              const streetMatches = outputData.filter((item: any) => {
                const streetNorm = normalizeStreetName(item['Đường']);
                return (streetNorm === queryNorm || streetNorm.includes(queryNorm) || queryNorm.includes(streetNorm));
              });

              if (streetMatches.length > 0) {
                const queryDistrictNorm = normalizeDistrictName(parsedAddress.district);
                const found = streetMatches.find((item: any) => {
                  const districtNorm = normalizeDistrictName(item['Quận']);
                  return districtNorm === queryDistrictNorm;
                });

                if (found) {
                  console.log('💰 Found price_gov object:', found);
                  price_gov = JSON.stringify(found);
                }
              }
            } catch (err) {
              console.log('⚠️  Error reading price_gov.json:', err);
            }
          }

          const locationString = `${parsedAddress.ward}, ${parsedAddress.district}, ${parsedAddress.city}`;
          const searchResult = await searchRealEstateDataEnhanced(locationString, parsedAddress, mergedDetails, streetName);
          const searchData = searchResult.formatted;
          
          console.log('✅ [PARALLEL] Search data completed');
                      return {
              type: 'search_data',
              data: {searchData: searchData || 'Không có dữ liệu search phù hợp từ internet.',
                price_gov: price_gov},
              jsonData: searchResult.json,
              sources: searchResult.sources,
              success: true
            };
        } catch (error) {
          console.error('❌ [PARALLEL] Search data error:', error);
          return {
            type: 'search_data',
            data: {
              searchData: 'Không thể truy cập dữ liệu search từ internet.',
              price_gov: ''
            },
            success: false,
            error: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })(),
    ];

    // Execute all tasks in parallel with timeout
    console.log('⏱️  Executing all tasks in parallel...');
    const parallelResults = await Promise.allSettled(parallelTasks);
    
    result.performance.step_times.parallel_execution = Date.now() - parallelStart;

    // Process parallel results and collect shared data
    let sharedSearchData = 'Không có dữ liệu search từ internet.';
    let sharedMarketData = 'Không có dữ liệu thị trường cho khu vực này.';
    let sharedPriceGov = '';
    let aiRealEstateData = null;
    let searchSources: string[] = [];

    parallelResults.forEach((taskResult, index) => {
      if (taskResult.status === 'fulfilled') {
        const taskValue = taskResult.value;
        const { type, data, success } = taskValue;
        const error = 'error' in taskValue ? taskValue.error : undefined;
        
        switch (type) {
          case 'utilities':
            result.utilities = data;
            console.log(`✅ Utilities: ${success ? 'Success' : 'Failed'}`);
            break;
          case 'price_trend':
            result.price_trend = data;
            if (success && data.success && data.data && data.data.length > 0) {
              sharedMarketData = formatMarketDataForAI(data);
            }
            console.log(`✅ Price Trend: ${success ? 'Success' : 'Failed'}`);
            break;
          case 'distance_analysis':
            result.distance_analysis = data;
            console.log(`✅ Distance Analysis: ${success ? 'Success' : 'Failed'}`);
            break;
          case 'search_data':
            if (data && typeof data === 'object') {
              sharedSearchData = data.searchData;
              sharedPriceGov = data.price_gov;
            } else {
              sharedSearchData = data;
            }
            aiRealEstateData = (taskValue as any).jsonData;
            searchSources = (taskValue as any).sources || [];
            console.log(`✅ Search Data: ${success ? 'Success' : 'Failed'}`);
            break;
        }
      } else {
        console.error(`❌ Task ${index} failed:`, taskResult.reason);
      }
    });

    // Gán dữ liệu bảng giá nhà nước vào kết quả (nếu có)
    if (sharedPriceGov) {
      try {
        result.price_gov_data = JSON.parse(sharedPriceGov);
      } catch (e) {
        result.price_gov_data = sharedPriceGov; // fallback dạng chuỗi
      }
    }

    // Step 8: Run AI Combined with shared data (NO MORE DUPLICATE CALLS!)
    console.log('\n🤖 STEP 8: Running optimized AI Combined with shared data...');
    const aiStart = Date.now();

    try {
      // Prepare shared AI input with all pre-fetched data
      const amenities = mergedDetails.amenities || mergedDetails.combinedAmenities || [];
      
      const sharedAIInput = {
        address: parsedAddress.formatted_address || '',
        city: parsedAddress.city || 'ha_noi',
        district: parsedAddress.district || 'dong_da', 
        ward: parsedAddress.ward || 'unknown',
        administrativeLevel: 0,
        type: mergedDetails.type || 'NORMAL',
        size: mergedDetails.houseArea || 45,
        lotSize: mergedDetails.landArea || 45,
        landArea: mergedDetails.landArea || 45,
        houseArea: mergedDetails.houseArea || 45,
        laneWidth: mergedDetails.laneWidth || 3,
        facadeWidth: mergedDetails.facadeWidth || 3,
        storyNumber: mergedDetails.storyNumber || 3,
        bedrooms: mergedDetails.bedRoom || 2,
        bathrooms: mergedDetails.bathRoom || 2,
        legal: mergedDetails.legal || 'contract',
        amenities: amenities,
        yearBuilt: mergedDetails.yearBuilt || 2015,
        marketData: sharedMarketData,
        searchData: sharedSearchData,
        price_gov: sharedPriceGov,
        alleyType: mergedDetails.alleyType || 'thong',
        houseDirection: mergedDetails.houseDirection || 'nam',
        soShape: mergedDetails.soShape || 'vuong',
        price_cafeland: cafelandAvg || undefined // <-- Thêm giá trung bình Cafeland
      };

      // 🔍 DEBUG AI INPUT DATA
      console.log('\n🔍 DEBUG: AI INPUT DATA VALIDATION');
      console.log('='.repeat(50));
      console.log('📍 Address/Location:', {
        address: sharedAIInput.address,
        city: sharedAIInput.city,
        district: sharedAIInput.district,
        ward: sharedAIInput.ward
      });
      console.log('🏠 Property Details:', {
        type: sharedAIInput.type,
        landArea: sharedAIInput.landArea,
        houseArea: sharedAIInput.houseArea,
        laneWidth: sharedAIInput.laneWidth,
        facadeWidth: sharedAIInput.facadeWidth,
        storyNumber: sharedAIInput.storyNumber,
        bedrooms: sharedAIInput.bedrooms,
        bathrooms: sharedAIInput.bathrooms,
        legal: sharedAIInput.legal,
        yearBuilt: sharedAIInput.yearBuilt
      });
      console.log('🧭 Direction & Shape:', {
        alleyType: sharedAIInput.alleyType,
        houseDirection: sharedAIInput.houseDirection,
        soShape: sharedAIInput.soShape
      });
      console.log('🎯 Amenities:', amenities.length > 0 ? amenities : 'No amenities provided');
      console.log('🏪 Utilities Status:', result.utilities ? 'SUCCESS' : 'FAILED');
      console.log('🏪 Utilities Total:', result.utilities?.total || 0);
      console.log('🏪 Utilities Data Count:', result.utilities?.data?.length || 0);
      console.log('📊 Market Data Length:', sharedMarketData ? sharedMarketData.length : 0);
      console.log('📊 Market Data Preview:', sharedMarketData ? sharedMarketData.substring(0, 200) + '...' : 'NO MARKET DATA');
      console.log('🔍 Search Data Length:', sharedSearchData ? (sharedSearchData.length || 0) : 0);
      console.log('🔍 Search Data Preview:', sharedSearchData ? sharedSearchData.substring(0, 200) + '...' : 'NO SEARCH DATA');
      console.log('💰 Price Gov:', sharedAIInput.price_gov);

      // Check for planning data
      const planning_data = body.planning_data;
      if (planning_data) {
        console.log('🗺️ Planning Data:', {
          imagePath: planning_data.imagePath,
          landInfoLength: planning_data.landInfo?.length || 0
        });
      }
      console.log('='.repeat(50));

      const aiCombinedResponse = await fetch(`${request.nextUrl.origin}/api/ai-combined`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          // Pass coordinates but skip all location/market/search API calls
          latitude,
          longitude,
          property_details: mergedDetails,
          auth_token,
          // Pass planning data if available
          planning_data: planning_data,
          // CRITICAL: Pass shared data to prevent duplicate calls
          _shared_data: {
            parsedAddress,
            marketData: sharedMarketData,
            searchData: sharedSearchData,
            price_gov: sharedPriceGov, // Pass the actual price_gov JSON string
            skip_data_fetching: true // Flag to skip duplicate API calls
          }
        }),
      });

      if (aiCombinedResponse.ok) {
        const aiCombinedData = await aiCombinedResponse.json();
        console.log('✅ AI Combined API completed successfully');
        
        // DEBUG: Log the full response structure
        // console.log('🔍 AI Combined Response Structure:', JSON.stringify(aiCombinedData, null, 2));
        console.log('🔍 Results Object:', aiCombinedData.results);
        console.log('🔍 Valuation Data:', aiCombinedData.results?.valuation);
        console.log('🔍 Analysis Data:', aiCombinedData.results?.analysis);
        console.log('🔍 Planning Data:', aiCombinedData.results?.planning);
        
        // Check if we have valid data
        if (aiCombinedData.success && aiCombinedData.results) {
          // Format AI results to match component expectations
          result.ai_valuation = {
            success: true,
            data: aiCombinedData.results.valuation, // Full valuation result from AI
            result: {
              valuation: aiCombinedData.results.valuation // Also support .result.valuation
            }
          };
          
          result.ai_analysis = {
            success: true,
            data: aiCombinedData.results.analysis, // Full analysis result (contains radarScore)
            result: {
              radarScore: aiCombinedData.results.analysis?.radarScore // Extract radarScore specifically
            }
          };

          // Add planning results if available
          if (aiCombinedData.results.planning) {
            result.planning_analysis = {
              success: true,
              data: aiCombinedData.results.planning,
              result: aiCombinedData.results.planning
            };
            console.log('✅ Planning Analysis integrated successfully');
          }
          
          // Additional validation
          if (!aiCombinedData.results.valuation) {
            console.log('⚠️  AI Valuation is null, checking errors...');
            console.log('🔍 Valuation Error:', aiCombinedData.errors?.valuation_error);
            result.ai_valuation.success = false;
            result.ai_valuation.error = aiCombinedData.errors?.valuation_error || 'Valuation failed';
          }
          
          if (!aiCombinedData.results.analysis) {
            console.log('⚠️  AI Analysis is null, checking errors...');
            console.log('🔍 Analysis Error:', aiCombinedData.errors?.analysis_error);
            result.ai_analysis.success = false;
            result.ai_analysis.error = aiCombinedData.errors?.analysis_error || 'Analysis failed';
          }

          if (planning_data && !aiCombinedData.results.planning) {
            console.log('⚠️  Planning Analysis is null, checking errors...');
            console.log('🔍 Planning Error:', aiCombinedData.errors?.planning_error);
            if (!result.planning_analysis) {
              result.planning_analysis = {
                success: false,
                error: aiCombinedData.errors?.planning_error || 'Planning analysis failed',
                data: null,
                result: null
              };
            }
          }
        } else {
          console.log('❌ AI Combined response indicates failure');
          result.error = aiCombinedData.error || 'AI Combined returned unsuccessful response';
          
          // Set failed AI results with proper structure
          result.ai_valuation = {
            success: false,
            error: aiCombinedData.error || 'AI Valuation failed',
            data: null,
            result: { valuation: null }
          };
          
          result.ai_analysis = {
            success: false,
            error: aiCombinedData.error || 'AI Analysis failed',
            data: null,
            result: { radarScore: null }
          };

          if (planning_data && !aiCombinedData.results?.planning) {
            result.planning_analysis = {
              success: false,
              error: aiCombinedData.errors?.planning_error || 'Planning analysis failed',
              data: null,
              result: null
            };
          }
        }
      } else {
        const errorText = await aiCombinedResponse.text();
        console.error('❌ AI Combined API failed:', aiCombinedResponse.status, errorText);
        result.error = `AI Combined failed: ${aiCombinedResponse.status} - ${errorText}`;
      }
    } catch (error) {
      console.error('❌ AI Combined error:', error);
      result.error = `AI Combined error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    result.performance.step_times.ai_execution = Date.now() - aiStart;

    // Set AI real estate data
    result.ai_real_estate_data = aiRealEstateData;
    result.search_sources = searchSources;
    
    // Calculate performance metrics
    const totalTime = Date.now() - startTime;
    result.performance.total_time = totalTime;
    result.success = true;

    console.log('\n🎉 SUPER-OPTIMIZED VALUATION FLOW COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⚡ Performance Improvement:`);
    console.log(`   - Total time: ${totalTime}ms`);
    console.log(`   - Location + Parsing: ${result.performance.step_times.location_and_parsing}ms`);
    console.log(`   - Parallel execution: ${result.performance.step_times.parallel_execution}ms`);
    console.log(`   - AI execution: ${result.performance.step_times.ai_execution}ms`);
    console.log(`   - Estimated old sequential time: ${result.performance.step_times.parallel_execution * 8}ms`);
    console.log(`   - Time saved: ~${(result.performance.step_times.parallel_execution * 7)}ms`);
    console.log(`   - Search API calls reduced: Multiple → 1 call`);
    console.log(`   - Location API calls reduced: 3+ → 1 call`);

    // Print summary
    console.log(`📍 Address: ${parsedAddress.formatted_address}`);
    console.log(`🏠 Address Object: City=${result.address?.city}, District=${result.address?.district}, Ward=${result.address?.ward}`);
    console.log(`📍 Location Details: Full=${result.location_details?.full_address || 'N/A'}`);
    console.log(`🏪 Utilities found: ${result.utilities?.total || 0}`);
    console.log(`📈 Price trend data points: ${result.price_trend?.data?.length || 0}`);
    console.log(`🤖 AI Valuation: ${result.ai_valuation ? 'Completed' : 'Failed'}`);
    console.log(`🧠 AI Analysis: ${result.ai_analysis ? 'Completed' : 'Failed'}`);
    console.log(`📏 Distance Analysis: ${result.distance_analysis ? 'Completed' : 'Failed'}`);
    
    // Print distance analysis summary
    if (result.distance_analysis) {
      const distanceData = result.distance_analysis;
      if (distanceData.distances?.toCityCenter) {
        console.log(`   🏛️  To city center (${distanceData.distances.toCityCenter.name}): ${distanceData.distances.toCityCenter.distance} km`);
      }
      if (distanceData.distances?.toDistrictCenter) {
        console.log(`   🏢 To district center (${distanceData.distances.toDistrictCenter.name}): ${distanceData.distances.toDistrictCenter.distance} km`);
      }
      if (distanceData.analysis?.accessibility) {
        console.log(`   🚗 Accessibility: ${distanceData.analysis.accessibility}`);
      }
    }
    
    // Set success flag based on critical components
    const hasAddress = !!(result.address && result.location_details);
    const hasValuation = !!(result.ai_valuation && result.ai_valuation.success);
    const hasAnalysis = !!(result.ai_analysis && result.ai_analysis.success);
    
    result.success = hasAddress && (hasValuation || hasAnalysis); // Success if we have address + at least one AI result
    
    // Check if critical AI operations failed
    if (!result.ai_valuation && !result.error) {
      result.error = 'AI Valuation failed - this is required for the system to work properly';
    }
    
    console.log(`✅ Overall Success: ${result.success}`);
    console.log(`📊 Address Parsed: ${hasAddress}`);
    console.log(`🤖 AI Components: Valuation=${hasValuation}, Analysis=${hasAnalysis}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in super-optimized complete flow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Error during flow execution: ${error}` 
      },
      { status: 500 }
    );
  }
} 