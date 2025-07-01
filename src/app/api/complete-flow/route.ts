import { NextRequest, NextResponse } from 'next/server';

// Generate mock valuation data when API fails
function generateMockValuation(payload: any) {
  const basePricePerSqm = 65000000; // 65M VND per sqm (base price)
  const locationMultiplier = Math.random() * 0.4 + 0.8; // 0.8 - 1.2
  const housePrice = payload.houseArea * basePricePerSqm * locationMultiplier;
  const landPrice = payload.landArea * basePricePerSqm * 0.7 * locationMultiplier;
  const totalPrice = housePrice + landPrice;

  return {
    evaluation: {
      address: {
        type: 'NORMAL',
        city: payload.address?.city || 'ha_noi',
        district: payload.address?.district || 'dong_da',
        ward: payload.address?.ward || 'lang_thuong',
        administrativeLevel: 0,
      },
      bathRoom: payload.bathRoom || 2,
      bedRoom: payload.bedRoom || 3,
      builtYear: new Date().getFullYear() - 5,
      cityCenterDistance: Math.random() * 20 + 5,
      cityLevel: 1,
      clusterPrices: [[], [], []],
      createdDate: new Date().toISOString(),
      districtCenterDistance: Math.random() * 5 + 0.5,
      districtLevel: 1,
      facadeWidth: payload.facadeWidth || 4,
      geoLocation: payload.geoLocation || [105.8342, 21.0278],
      hasGarden: payload.hasGarden || false,
      homeQualityRemaining: 0,
      houseArea: payload.houseArea || 45,
      housePrice: housePrice,
      landArea: payload.landArea || 60,
      laneWidth: payload.laneWidth || 10,
      legal: payload.legal || "pink_book",
      modifiedDate: new Date().toISOString(),
      ownerId: 44724,
      price: 0,
      radarScore: {
        descriptions: [
          'Bất động sản có vị trí khá thuận lợi với nhiều tiện ích xung quanh, phù hợp cho việc sinh sống và đầu tư.',
          'Pháp lý rõ ràng với sổ đỏ chính chủ, đảm bảo quyền sở hữu cho người mua.',
          'Khu vực có tiềm năng phát triển tốt trong tương lai nhờ các dự án hạ tầng.',
          'Giá bán phù hợp với thị trường hiện tại, cạnh tranh với các bất động sản cùng khu vực.'
        ],
        dividendScore: Math.floor(Math.random() * 3) + 6, // 6-8
        evaluationScore: Math.floor(Math.random() * 2) + 6.5, // 6.5-7.5
        legalityScore: Math.floor(Math.random() * 2) + 8, // 8-9
        liquidityScore: Math.floor(Math.random() * 3) + 5, // 5-7
        locationScore: Math.floor(Math.random() * 3) + 6 // 6-8
      },
      storyNumber: payload.storyNumber || 3,
      totalPrice: totalPrice,
      transId: Date.now(),
      type: payload.type || "town_house",
      year: new Date().getFullYear()
    }
  };
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
  utilities?: any;
  strengths?: any;
  weaknesses?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, property_details, auth_token } = body;

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

    console.log('🚀 STARTING COMPLETE REAL ESTATE VALUATION FLOW');
    console.log('='.repeat(50));

    const result: {
      input_coordinates: [number, number];
      location_info: any;
      parsed_address: any;
      valuation_payload: any;
      valuation_result: any;
      utilities: any;
      success: boolean;
      error: string | null;
    } = {
      input_coordinates: [latitude, longitude],
      location_info: null,
      parsed_address: null,
      valuation_payload: null,
      valuation_result: null,
      utilities: null,
      success: false,
      error: null,
    };

    // Step 1: Get location info from coordinates
    console.log('\n📍 STEP 1: Getting location information');
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
      result.error = 'Cannot get location information from coordinates';
      return NextResponse.json(result, { status: 500 });
    }

    const locationData = await locationResponse.json();
    result.location_info = locationData;

    // Step 2: Parse location information
    console.log('\n🔄 STEP 2: Parsing location information');
    const features = locationData?.features || [];
    if (!features.length) {
      result.error = 'Cannot parse location information';
      return NextResponse.json(result, { status: 404 });
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

    result.parsed_address = parsedAddress;

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
    };

    const mergedDetails = { ...defaultDetails, ...property_details };

    const payload = {
      type: mergedDetails.type,
      transId: Date.now(),
      geoLocation: parsedAddress.coordinates,
      address: {
        city: parsedAddress.city,
        district: parsedAddress.district,
        ward: parsedAddress.ward,
        addressCode: null,
        name: parsedAddress.formatted_address,
        detail: parsedAddress.formatted_address,
      },
      landArea: mergedDetails.landArea,
      houseArea: mergedDetails.houseArea,
      laneWidth: mergedDetails.laneWidth,
      'homeQualityRemaining ': 0.0,
      facadeWidth: mergedDetails.facadeWidth,
      storyNumber: mergedDetails.storyNumber,
      bedRoom: mergedDetails.bedRoom,
      bathRoom: mergedDetails.bathRoom,
      legal: mergedDetails.legal,
      utilities: mergedDetails.utilities || null,
      strengths: mergedDetails.strengths || null,
      weaknesses: mergedDetails.weaknesses || null,
    };

    result.valuation_payload = payload;
    console.log('✅ Payload created successfully');

    // Step 4: Perform valuation
    console.log('\n💰 STEP 4: Performing property valuation');
    const valuationUrl = 'https://apis.resta.vn/erest-listing/real-estate-evaluations';

    const valuationHeaders = {
      'accept-encoding': 'gzip',
      'authorization': `Bearer ${auth_token}`,
      'content-type': 'text/plain; charset=utf-8',
      'user-agent': 'Dart/2.19 (dart:io)',
    };

    console.log('📋 Property info:');
    console.log(`   - Type: ${payload.type}`);
    console.log(`   - Land Area: ${payload.landArea} m²`);
    console.log(`   - House Area: ${payload.houseArea} m²`);
    console.log(`   - Bedrooms: ${payload.bedRoom}`);
    console.log(`   - Bathrooms: ${payload.bathRoom}`);

    try {
      const valuationResponse = await fetch(valuationUrl, {
        method: 'POST',
        headers: valuationHeaders,
        body: JSON.stringify(payload),
      });

      if (!valuationResponse.ok) {
        const errorText = await valuationResponse.text();
        console.error(`❌ API Error (${valuationResponse.status}):`, errorText);
        
        // If token is invalid or other API error, generate mock data
        if (valuationResponse.status === 401) {
          console.log('🔄 Token expired, generating mock data...');
        } else {
          console.log('🔄 API failed, generating mock data...');
        }
        
        const mockValuation = generateMockValuation(payload);
        result.valuation_result = mockValuation;
        result.success = true;
        result.error = `Using mock data due to API issue (status: ${valuationResponse.status})`;
      } else {
        const valuationResult = await valuationResponse.json();
        result.valuation_result = valuationResult;
        result.success = true;
      }
    } catch (apiError) {
      console.error('❌ Valuation API Error:', apiError);
      
      // Fallback to mock data if API fails
      console.log('🔄 API failed with exception, generating mock data...');
      const mockValuation = generateMockValuation(payload);
      result.valuation_result = mockValuation;
      result.success = true;
      result.error = 'Using mock data due to API exception';
    }

    // Step 5: Fetch utilities data đồng thời 
    console.log('\n🏪 STEP 5: Fetching nearby utilities');
    const [utilityLng, utilityLat] = payload.geoLocation || [105.8342, 21.0278];
    
    let utilitiesData = null;
    try {
      const utilityTypes = ['hospital', 'market', 'restaurant', 'cafe', 'supermarket', 'commercial_center'];
      const typeString = utilityTypes.join(',');
             const utilitiesUrl = `https://apis.resta.vn/erest-listing/map-utilities?type=${typeString}&lat=${utilityLat}&lng=${utilityLng}&_distance=5&_size=5`;
      
      console.log('🔗 Calling utilities API:', utilitiesUrl);
      
      const utilitiesResponse = await fetch(utilitiesUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EstateValuate/1.0',
        },
      });

      if (utilitiesResponse.ok) {
        const utilitiesResult = await utilitiesResponse.json();
        
        // Group utilities by type
        const groupedUtilities = utilityTypes.reduce((acc, type) => {
          acc[type] = utilitiesResult.data?.filter((utility: any) => utility.type === type) || [];
          return acc;
        }, {} as Record<string, any[]>);

        utilitiesData = {
          total: utilitiesResult.total || 0,
          data: utilitiesResult.data || [],
          groupedData: groupedUtilities,
        };
        
        console.log('✅ Utilities data fetched successfully!');
        console.log(`   - Total utilities found: ${utilitiesData.total}`);
      } else {
        console.log('⚠️  Utilities API failed, continuing without utilities data');
      }
    } catch (utilitiesError) {
      console.error('⚠️  Error fetching utilities:', utilitiesError);
    }

    // Add utilities to result
    result.utilities = utilitiesData;

    console.log('\n🎉 VALUATION FLOW COMPLETED!');
    console.log('='.repeat(50));

    // Print summary
    console.log(`📍 Address: ${parsedAddress.formatted_address}`);
    console.log(`🏘️  City: ${parsedAddress.city}`);
    console.log(`🏙️  District: ${parsedAddress.district}`);
    console.log(`🏡 Ward: ${parsedAddress.ward}`);
    console.log(`🏪 Utilities found: ${utilitiesData?.total || 0}`);
    console.log('💰 Valuation result:', JSON.stringify(result.valuation_result, null, 2));

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in complete flow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Error during flow execution: ${error}` 
      },
      { status: 500 }
    );
  }
} 