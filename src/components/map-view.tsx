'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { getGeoapifyApiKey } from '@/lib/config';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
}

interface MapViewProps {
  selectedLocation?: LocationData | null;
}

export function MapView({ selectedLocation }: MapViewProps) {
  // Use selected location or default to Hanoi
  const location = selectedLocation || {
    latitude: 21.002909,
    longitude: 105.792854,
  };

  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright-grey&width=600&height=400&center=lonlat:${location.longitude},${location.latitude}&zoom=15.3276&marker=lonlat:${location.longitude},${location.latitude};color:%23ff0000;size:medium&scaleFactor=2&apiKey=${getGeoapifyApiKey()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <MapPin className="h-5 w-5"/>
          Xem trên bản đồ
        </CardTitle>
        <CardDescription>
          {selectedLocation 
            ? `Vị trí bất động sản và khu vực lân cận tại ${selectedLocation.address || 'vị trí đã chọn'}.`
            : 'Vị trí của bất động sản và khu vực lân cận.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={mapUrl}
            alt={`Bản đồ vị trí ${selectedLocation?.address || 'bất động sản'}`}
            width={800}
            height={600}
            className="h-full w-full object-cover"
            data-ai-hint="map city"
            priority
          />
        </div>
        {selectedLocation && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>📍 Vị trí:</strong> {selectedLocation.address}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tọa độ: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
