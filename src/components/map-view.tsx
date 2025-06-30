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
            Map View
        </CardTitle>
        <CardDescription>
            Location of the property and the surrounding area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src="https://placehold.co/800x600.png"
            alt="Map of property location"
            width={800}
            height={600}
            className="h-full w-full object-cover"
            data-ai-hint="map city"
          />
        </div>
      </CardContent>
    </Card>
  );
}
