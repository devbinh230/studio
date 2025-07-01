import { NextRequest, NextResponse } from 'next/server';
import { UtilitiesResponse, UtilityType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const distance = searchParams.get('distance') || '10';
    const size = searchParams.get('size') || '5';
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Thiếu thông tin tọa độ (lat, lng)' },
        { status: 400 }
      );
    }

    // Define utility types to search for
    const types: UtilityType[] = [
      'hospital',
      'market', 
      'restaurant',
      'cafe',
      'supermarket',
      'commercial_center'
    ];

    const typeString = types.join(',');
    const apiUrl = `https://apis.resta.vn/erest-listing/map-utilities?type=${typeString}&lat=${lat}&lng=${lng}&_distance=${distance}&_size=${size}`;

    console.log('Calling utilities API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EstateValuate/1.0',
      },
    });

    if (!response.ok) {
      console.error('Utilities API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Không thể lấy dữ liệu tiện ích xung quanh' },
        { status: response.status }
      );
    }

    const data: UtilitiesResponse = await response.json();
    
    // Group utilities by type for easier display
    const groupedUtilities = types.reduce((acc, type) => {
      acc[type] = data.data.filter(utility => utility.type === type);
      return acc;
    }, {} as Record<UtilityType, typeof data.data>);

    return NextResponse.json({
      total: data.total,
      data: data.data,
      groupedData: groupedUtilities,
    });

  } catch (error) {
    console.error('Error fetching utilities:', error);
    return NextResponse.json(
      { error: 'Lỗi server khi lấy dữ liệu tiện ích xung quanh' },
      { status: 500 }
    );
  }
} 