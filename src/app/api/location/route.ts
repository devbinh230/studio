import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const url = 'https://apis.resta.vn/erest-listing/features/location';
    const params = new URLSearchParams({
      latitude: latitude,
      longitude: longitude,
    });

    const headers = {
      'accept-encoding': 'gzip',
      'host': 'apis.resta.vn',
      'user-agent': 'Dart/2.19 (dart:io)',
    };

    console.log(`🔍 Getting location info for coordinates: ${latitude}, ${longitude}`);

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Location info retrieved successfully');

    // Parse the response
    const features = data?.features || [];
    if (!features.length) {
      return NextResponse.json(
        { error: 'No location information found' },
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

    return NextResponse.json({
      success: true,
      location_info: data,
      parsed_address: parsedAddress,
    });

  } catch (error) {
    console.error('❌ Error getting location info:', error);
    return NextResponse.json(
      { error: 'Failed to get location information' },
      { status: 500 }
    );
  }
} 