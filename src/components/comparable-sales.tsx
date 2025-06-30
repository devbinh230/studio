'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Bath, LayoutPanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const comparableProperties = [
    {
        address: '2 Tôn Đức Thắng, Bến Nghé, Quận 1',
        price: 15500000000,
        area: 120,
        beds: 3,
        baths: 2,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'luxury apartment interior',
    },
    {
        address: '88 Đồng Khởi, Bến Nghé, Quận 1',
        price: 13800000000,
        area: 105,
        beds: 2,
        baths: 2,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'modern apartment balcony',
    },
    {
        address: '9-11 Tôn Đức Thắng, Bến Nghé, Quận 1',
        price: 17200000000,
        area: 135,
        beds: 3,
        baths: 3,
        image: 'https://placehold.co/600x400.png',
        aiHint: 'penthouse living room',
    },
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
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
        <CardTitle className="font-headline">Bất động sản tương đương</CardTitle>
        <CardDescription>Các bất động sản tương tự đã bán gần đây.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comparableProperties.map((prop, index) => (
          <article key={index} className="flex gap-4 items-center">
            <Image
              src={prop.image}
              alt={`Hình ảnh bên ngoài của ${prop.address}`}
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
                <Badge variant="secondary" className="flex items-center gap-1"><LayoutPanelLeft className="h-3 w-3" /> {prop.area} m²</Badge>
              </div>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
