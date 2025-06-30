import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address_info, property_details } = body;

    if (!address_info) {
      return NextResponse.json(
        { error: 'Address info is required' },
        { status: 400 }
      );
    }

    const coordinates = address_info.coordinates || [];

    // Default property details
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
    };

    // Merge default with user input
    const mergedDetails = { ...defaultDetails, ...property_details };

    const payload = {
      type: mergedDetails.type,
      transId: Date.now(), // Use timestamp as transaction ID
      geoLocation: coordinates, // [longitude, latitude] format
      address: {
        city: address_info.city || '',
        district: address_info.district || '',
        ward: address_info.ward || '',
        addressCode: null,
        name: address_info.formatted_address || '',
        detail: address_info.formatted_address || '',
      },
      landArea: mergedDetails.landArea,
      houseArea: mergedDetails.houseArea,
      laneWidth: mergedDetails.laneWidth,
      'homeQualityRemaining ': 0.0, // Keep the space in key name for API compatibility
      facadeWidth: mergedDetails.facadeWidth,
      storyNumber: mergedDetails.storyNumber,
      bedRoom: mergedDetails.bedRoom,
      bathRoom: mergedDetails.bathRoom,
      legal: mergedDetails.legal,
      utilities: mergedDetails.utilities || null,
      strengths: mergedDetails.strengths || null,
      weaknesses: mergedDetails.weaknesses || null,
    };

    console.log('📋 Valuation payload created successfully');
    console.log(`   - Type: ${payload.type}`);
    console.log(`   - Land Area: ${payload.landArea} m²`);
    console.log(`   - House Area: ${payload.houseArea} m²`);
    console.log(`   - Bedrooms: ${payload.bedRoom}`);
    console.log(`   - Bathrooms: ${payload.bathRoom}`);

    return NextResponse.json({
      success: true,
      payload,
    });

  } catch (error) {
    console.error('❌ Error creating payload:', error);
    return NextResponse.json(
      { error: 'Failed to create valuation payload' },
      { status: 500 }
    );
  }
} 