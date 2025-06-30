'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export function MapView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <MapPin className="h-5 w-5"/>
            Xem trên bản đồ
        </CardTitle>
        <CardDescription>
            Vị trí của bất động sản và khu vực lân cận.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src="https://placehold.co/800x600.png"
            alt="Bản đồ vị trí bất động sản"
            width={800}
            height={600}
            className="h-full w-full object-cover"
            data-ai-hint="map city"
            priority
          />
        </div>
      </CardContent>
    </Card>
  );
}
