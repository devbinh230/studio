import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, auth_token } = body;

    if (!payload) {
      return NextResponse.json(
        { error: 'Valuation payload is required' },
        { status: 400 }
      );
    }

    if (!auth_token) {
      return NextResponse.json(
        { error: 'Auth token is required' },
        { status: 400 }
      );
    }

    const url = 'https://apis.resta.vn/erest-listing/real-estate-evaluations';

    const headers = {
      'accept-encoding': 'gzip',
      'authorization': `Bearer ${auth_token}`,
      'content-type': 'text/plain; charset=utf-8',
      'user-agent': 'Dart/2.19 (dart:io)',
    };

    console.log('💰 Performing property valuation...');
    console.log('📋 Property info:');
    console.log(`   - Type: ${payload.type}`);
    console.log(`   - Land Area: ${payload.landArea} m²`);
    console.log(`   - House Area: ${payload.houseArea} m²`);
    console.log(`   - Bedrooms: ${payload.bedRoom}`);
    console.log(`   - Bathrooms: ${payload.bathRoom}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP error ${response.status}:`, errorText);
      return NextResponse.json(
        { 
          error: `Valuation failed with status ${response.status}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Valuation completed successfully!');

    return NextResponse.json({
      success: true,
      valuation_result: result,
    });

  } catch (error) {
    console.error('❌ Error during valuation:', error);
    return NextResponse.json(
      { error: 'Failed to perform property valuation' },
      { status: 500 }
    );
  }
} 