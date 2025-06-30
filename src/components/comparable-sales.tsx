'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Bath, LayoutPanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const comparableProperties = [
    {
        address: '455 Riverfront Walk, Anytown',
        price: 525000,
        area: 1900,
        beds: 3,
        baths: 2,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'luxury apartment interior',
    },
    {
        address: '101 Skyview Terrace, Anytown',
        price: 495000,
        area: 1750,
        beds: 2,
        baths: 2,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'modern apartment balcony',
    },
    {
        address: '33 Central Plaza, Anytown',
        price: 550000,
        area: 2050,
        beds: 3,
        baths: 2.5,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'penthouse living room',
    },
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

export function ComparableSales() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Comparable Sales</CardTitle>
        <CardDescription>Recently sold properties in the area.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comparableProperties.map((prop, index) => (
          <article key={index} className="flex gap-4 items-center">
            <Image
              src={prop.image}
              alt={`Exterior view of ${prop.address}`}
              width={100}
              height={100}
              data-ai-hint={prop.aiHint}
              className="rounded-lg object-cover aspect-square"
            />
            <div className="flex-grow">
              <p className="font-semibold">{isMounted ? formatCurrency(prop.price) : '...'}</p>
              <p className="text-sm text-muted-foreground">{prop.address}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="secondary" className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {prop.beds}</Badge>
                <Badge variant="secondary" className="flex items-center gap-1"><Bath className="h-3 w-3" /> {prop.baths}</Badge>
                <Badge variant="secondary" className="flex items-center gap-1"><LayoutPanelLeft className="h-3 w-3" /> {prop.area} sqft</Badge>
              </div>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
