'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Bath, LayoutPanelLeft } from 'lucide-react';

const comparableProperties = [
    {
        address: '246 Oak St, Anytown',
        price: 485000,
        area: 1850,
        beds: 3,
        baths: 2,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'modern house exterior',
    },
    {
        address: '731 Pine Ave, Anytown',
        price: 510000,
        area: 1950,
        beds: 4,
        baths: 2,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'suburban home',
    },
    {
        address: '88 Maple Dr, Anytown',
        price: 470000,
        area: 1780,
        beds: 3,
        baths: 2.5,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'classic house',
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
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">Comparable Sales</CardTitle>
            <CardDescription>Recently sold properties in the area.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {comparableProperties.map((prop, index) => (
                <div key={index} className="flex gap-4 items-center">
                    <Image 
                        src={prop.image} 
                        alt={prop.address} 
                        width={100} 
                        height={100}
                        data-ai-hint={prop.aiHint}
                        className="rounded-lg object-cover aspect-square"
                    />
                    <div className="flex-grow">
                        <p className="font-semibold">{formatCurrency(prop.price)}</p>
                        <p className="text-sm text-muted-foreground">{prop.address}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="secondary" className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {prop.beds}</Badge>
                            <Badge variant="secondary" className="flex items-center gap-1"><Bath className="h-3 w-3" /> {prop.baths}</Badge>
                            <Badge variant="secondary" className="flex items-center gap-1"><LayoutPanelLeft className="h-3 w-3" /> {prop.area} sqft</Badge>
                        </div>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
  );
}
