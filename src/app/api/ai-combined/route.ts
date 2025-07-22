import { NextRequest, NextResponse } from 'next/server';
import { propertyAnalysis } from '@/ai/flows/property-analysis';
import { propertyValuationRange } from '@/ai/flows/property-valuation';
import { planningAnalysis } from '@/ai/flows/planning-analysis';

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
  soShape?: string;
  utilities?: any;
  amenities?: string[];
  combinedAmenities?: string[];
}

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🤖🔥 ================= AI COMBINED API =================');

  try {
    const { latitude, longitude, property_details, _shared_data, run_planning_analysis } = await request.json();
    
    // Check if we should run planning analysis
    const shouldRunPlanningAnalysis = !!run_planning_analysis;
    if (shouldRunPlanningAnalysis) {
      console.log('🔍 Running Planning Analysis requested');
    }

    // Check if we have shared data to avoid duplicate API calls
    const hasSharedData = _shared_data && _shared_data.skip_data_fetching;
    
    if (hasSharedData) {
      console.log('⚡ USING SHARED DATA - SKIPPING DUPLICATE API CALLS');
      console.log('✅ Received pre-fetched data from complete-flow');
    } else {
      console.log('⚡ Running AI functions in PARALLEL');
    }

    if (latitude && longitude) {
      console.log(`📍 Coordinates: ${latitude}, ${longitude}`);
    } else {
      console.log('⚠️  No coordinates provided – will skip reverse-geocoding and use fallback address');
    }

    console.log(`🏠 Property details:`, property_details);

    let parsedAddress;
    let marketData = "Không có dữ liệu thị trường cho khu vực này.";
    let searchData = "Không có dữ liệu search từ internet.";
    let price_gov = '';
    let planningAnalysisResult = null;
    let planningImagePaths = [];

    if (hasSharedData) {
      // Use shared data from complete-flow (OPTIMIZED PATH)
      console.log('\n📦 STEP 1: Using shared data from complete-flow...');
      const step1Start = Date.now();
      
      // 🔍 DEBUG: Check shared data structure
      console.log('🔍 DEBUG: Shared Data Structure');
      console.log('_shared_data keys:', Object.keys(_shared_data || {}));
      console.log('_shared_data.parsedAddress:', _shared_data?.parsedAddress);
      console.log('_shared_data.marketData length:', _shared_data?.marketData?.length || 0);
      console.log('_shared_data.searchData length:', _shared_data?.searchData?.length || 0);
      console.log('_shared_data.skip_data_fetching:', _shared_data?.skip_data_fetching);
      
      parsedAddress = _shared_data.parsedAddress;
      marketData = _shared_data.marketData || marketData;
      searchData = _shared_data.searchData || searchData;
      price_gov = _shared_data.price_gov || '';
      
      console.log(`✅ Using shared parsed address: ${parsedAddress.formatted_address || `${parsedAddress.ward}, ${parsedAddress.district}, ${parsedAddress.city}`}`);
      console.log(`✅ Using shared market data: ${marketData.length > 50 ? 'Available' : 'Not available'}`);
      console.log(`✅ Using shared search data: ${searchData.length > 50 ? 'Available' : 'Not available'}`);
      console.log(`✅ Using shared price_gov: ${price_gov}`);
      console.log(`⏱️  Step 1 time: ${Date.now() - step1Start}ms`);
      
    } else {
      // Original path for standalone usage (FALLBACK PATH)
    console.log('\n📍 STEP 1: Determining location information...');
    const step1Start = Date.now();

    type ParsedAddress = {
      city: string;
      district: string;
      ward: string;
      formatted_address: string;
    };

      parsedAddress = {
      city: property_details?.city || 'ha_noi',
      district: property_details?.district || 'dong_da',
      ward: property_details?.ward || 'unknown',
      formatted_address: property_details?.address || '',
    };

    if (latitude && longitude) {
      try {
        const locationUrl = `${request.nextUrl.origin}/api/location`;
        const locationParams = new URLSearchParams({
          lat: latitude.toString(),
          lng: longitude.toString(),
        });

        const locationResponse = await fetch(`${locationUrl}?${locationParams}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          parsedAddress = locationData.parsedAddress as ParsedAddress;
          console.log(`✅ Reverse-geocoding success: ${parsedAddress.formatted_address}`);
        } else {
          console.log('⚠️  Reverse-geocoding failed – using fallback address');
        }
      } catch (locError) {
        console.log('⚠️  Reverse-geocoding exception – using fallback address:', locError);
      }
    }

    console.log(`✅ Parsed address: ${parsedAddress.formatted_address || `${parsedAddress.ward}, ${parsedAddress.district}, ${parsedAddress.city}`}`);
    console.log(`⏱️  Step 1 time: ${Date.now() - step1Start}ms`);

    // Step 2: Get market data from price trend
    console.log('\n📈 STEP 2: Getting market data...');
    const step2Start = Date.now();

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

    const category = mapPropertyTypeToCategory(property_details?.type || 'NORMAL');
    
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

    if (priceTrendResponse.ok) {
      const priceTrendData = await priceTrendResponse.json();
      if (priceTrendData.success && priceTrendData.data && priceTrendData.data.length > 0) {
        marketData = formatMarketDataForAI(priceTrendData);
        console.log('✅ Market data received');
      } else {
        console.log('⚠️  Price trend API returned no data');
      }
    } else {
      console.log('⚠️  Price trend API failed');
    }

    console.log(`⏱️  Step 2 time: ${Date.now() - step2Start}ms`);
    }
    
    // Step 2.5: Fetch planning images if planning analysis requested
    if (shouldRunPlanningAnalysis && latitude && longitude) {
      console.log('\n🗺️ STEP 2.5: Getting planning images...');
      const step25Start = Date.now();
      
      try {
        // Call the planning-images API
        const planningImagesUrl = `${request.nextUrl.origin}/api/test-planning-images`;
        const planningImagesResponse = await fetch(planningImagesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            zoom: 18,
          }),
        });
        
        if (planningImagesResponse.ok) {
          const imagesData = await planningImagesResponse.json();
          if (imagesData.success && imagesData.imagePaths && imagesData.imagePaths.length > 0) {
            planningImagePaths = imagesData.imagePaths;
            console.log('✅ Planning images fetched:', planningImagePaths.length);
          } else {
            console.log('⚠️ Planning images API returned no data');
          }
        } else {
          console.log('⚠️ Planning images API failed');
        }
        
        // Get land info
        const landInfoUrl = `${request.nextUrl.origin}/api/guland-proxy/planning`;
        const landInfoResponse = await fetch(landInfoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marker_lat: latitude,
            marker_lng: longitude,
            province_id: 1, // Assuming Hanoi
          }),
        });
        
        let landInfo = '';
        if (landInfoResponse.ok) {
          const landInfoData = await landInfoResponse.json();
          if (landInfoData.success && landInfoData.data?.html) {
            // Extract text from HTML
            const html = landInfoData.data.html;
            landInfo = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            console.log('✅ Land info fetched:', landInfo.length > 0 ? 'Available' : 'Not available');
          } else {
            console.log('⚠️ Land info unavailable');
          }
        }
        
        // Run planning analysis if we have images and land info
        if (planningImagePaths.length > 0) {
          console.log('🧠 Running planning analysis...');
          planningAnalysisResult = await planningAnalysis({
            imagePaths: planningImagePaths,
            landInfo: landInfo || `Địa điểm: ${latitude}, ${longitude}`
          });
          console.log('✅ Planning analysis completed');
        }
      } catch (planningError) {
        console.error('❌ Error in planning analysis:', planningError);
      }
      
      console.log(`⏱️ Planning step time: ${Date.now() - step25Start}ms`);
    }

    // Step 3: Prepare shared AI input
    console.log('\n🛠️  STEP 3: Preparing shared AI input...');
    const step3Start = Date.now();

    const defaultDetails = {
      type: 'town_house',
      landArea: 45.0,
      houseArea: 45.0,
      laneWidth: 3.0,
      facadeWidth: 4.0,
      storyNumber: 3.0,
      bedRoom: 2,
      bathRoom: 2,
      legal: 'pink_book',
      yearBuilt: 2015,
      alleyType: 'thong',
      houseDirection: 'nam',
      soShape: 'vuong',
    };

    const mergedDetails = { ...defaultDetails, ...property_details };

    // Get amenities from utilities data
    const amenities = mergedDetails.amenities || mergedDetails.combinedAmenities || [];

    const sharedInput = {
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
      marketData: marketData, // Use either shared or fetched data
      searchData: searchData, // Use either shared or fetched data
      price_gov: price_gov,
      alleyType: mergedDetails.alleyType || 'thong',
      houseDirection: mergedDetails.houseDirection || 'nam',
      soShape: mergedDetails.soShape || 'vuong'
    };

    console.log('📊 Shared AI Input prepared');
    console.log(`⏱️  Step 3 time: ${Date.now() - step3Start}ms`);

    // 🔍 DEBUG: DETAILED AI INPUT VALIDATION
    console.log('\n🔍 DEBUG: FINAL AI INPUT VALIDATION');
    console.log('='.repeat(60));
    console.log('📍 Location Info:', {
      address: sharedInput.address,
      city: sharedInput.city,
      district: sharedInput.district,
      ward: sharedInput.ward,
      administrativeLevel: sharedInput.administrativeLevel
    });
    console.log('🏠 Property Specifications:', {
      type: sharedInput.type,
      landArea: sharedInput.landArea,
      houseArea: sharedInput.houseArea,
      size: sharedInput.size,
      lotSize: sharedInput.lotSize,
      laneWidth: sharedInput.laneWidth,
      facadeWidth: sharedInput.facadeWidth,
      storyNumber: sharedInput.storyNumber,
      bedrooms: sharedInput.bedrooms,
      bathrooms: sharedInput.bathrooms,
      legal: sharedInput.legal,
      yearBuilt: sharedInput.yearBuilt
    });
    console.log('🧭 Additional Properties:', {
      alleyType: sharedInput.alleyType,
      houseDirection: sharedInput.houseDirection,
      soShape: sharedInput.soShape
    });
    console.log('🎯 Amenities Count:', sharedInput.amenities?.length || 0);
    console.log('🎯 Amenities List:', sharedInput.amenities || []);
    console.log('📊 Market Data Status:', {
      hasMarketData: !!sharedInput.marketData,
      marketDataLength: sharedInput.marketData?.length || 0,
      marketDataPreview: sharedInput.marketData ? sharedInput.marketData.substring(0, 150) + '...' : 'MISSING'
    });
    console.log('🔍 Search Data Status:', {
      hasSearchData: !!sharedInput.searchData,
      searchDataLength: sharedInput.searchData?.length || 0,
      searchDataPreview: sharedInput.searchData ? sharedInput.searchData.substring(0, 150) + '...' : 'MISSING'
    });
    console.log('💰 Price Gov:', sharedInput.price_gov || 'NOT PROVIDED');
    console.log('🔄 Data Source:', hasSharedData ? 'SHARED FROM COMPLETE-FLOW' : 'FETCHED INDEPENDENTLY');
    console.log('='.repeat(60));

    // Add raw JSON logging for debug
    console.log('📊 AI Input (formatted):', JSON.stringify(sharedInput, null, 2));
    console.log('🔍 AI Input (raw JSON for debug):', JSON.stringify(sharedInput));
    console.log('📏 AI Input size:', JSON.stringify(sharedInput).length, 'characters');

    // Step 4: Run AI functions in PARALLEL
    console.log('\n🚀 STEP 4: Running AI functions in PARALLEL...');
    const step4Start = Date.now();

    console.log('⚡ Starting propertyValuationRange...');
    console.log('⚡ Starting propertyAnalysis...');
    
    // Add planning to parallel execution if requested
    const tasks = [
      propertyValuationRange(sharedInput).catch(error => {
        console.error('❌ Valuation error:', error);
        return { error: `Valuation failed: ${error.message}` };
      }),
      propertyAnalysis(sharedInput).catch(error => {
        console.error('❌ Analysis error:', error);
        return { error: `Analysis failed: ${error.message}` };
      })
    ];
    
    // Run all tasks in parallel
    const results = await Promise.all(tasks);
    const [valuationResult, analysisResult] = results;

    const step4Time = Date.now() - step4Start;
    console.log(`⚡ AI functions completed in ${step4Time}ms`);
    console.log('✅ Property Valuation:', 'error' in valuationResult ? 'Failed' : 'Success');
    console.log('✅ Property Analysis:', 'error' in analysisResult ? 'Failed' : 'Success');
    if (planningAnalysisResult) {
      console.log('✅ Planning Analysis:', planningAnalysisResult ? 'Success' : 'Failed');
    }

    // DEBUG: Log detailed AI results
    console.log('🔍 DEBUG: AI Results Analysis');
    console.log('📊 Valuation Result Type:', typeof valuationResult);
    console.log('📊 Valuation Result:', valuationResult);
    console.log('📊 Analysis Result Type:', typeof analysisResult);
    console.log('📊 Analysis Result:', analysisResult);
    
    // Check for errors in results
    if ('error' in valuationResult) {
      console.log('❌ VALUATION FAILED:', valuationResult.error);
    } else {
      console.log('✅ VALUATION SUCCESS:', Object.keys(valuationResult || {}));
    }
    
    if ('error' in analysisResult) {
      console.log('❌ ANALYSIS FAILED:', analysisResult.error);
    } else {
      console.log('✅ ANALYSIS SUCCESS:', Object.keys(analysisResult || {}));
    }

    // Final result
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total execution time: ${totalTime}ms`);
    if (hasSharedData) {
      console.log('🔥 PERFORMANCE BOOST: Used shared data, eliminated duplicate API calls!');
    }
    console.log('🤖🔥 =================');

    return NextResponse.json({
      success: true,
      results: {
        valuation: 'error' in valuationResult ? null : valuationResult,
        analysis: 'error' in analysisResult ? null : analysisResult,
        planning: planningAnalysisResult
      },
      input_data: {
        coordinates: latitude && longitude ? [latitude, longitude] : null,
        property_details: property_details,
        parsed_address: parsedAddress,
        shared_input: sharedInput,
        used_shared_data: hasSharedData, // Track optimization usage
        planning_images: planningImagePaths
      },
      performance: {
        total_time: totalTime,
        step_times: {
          data_preparation: Date.now() - step3Start,
          parallel_ai_execution: step4Time,
        },
        optimization: {
          used_shared_data: hasSharedData,
          eliminated_api_calls: hasSharedData ? ['location', 'price-trend', 'search-utils'] : [],
          time_saved_by_sharing: hasSharedData ? 'Significant - avoided duplicate API calls' : 'None'
        }
      },
      errors: {
        valuation_error: 'error' in valuationResult ? valuationResult.error : null,
        analysis_error: 'error' in analysisResult ? analysisResult.error : null,
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ AI Combined API Error:', error);
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