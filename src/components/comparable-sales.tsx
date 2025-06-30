'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Bath, LayoutPanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const comparableProperties = [
    {
        address: 'The Marq, 29B Nguyễn Đình Chiểu, Đa Kao, Quận 1',
        price: 16000000000,
        area: 125,
        beds: 3,
        baths: 2,
        image: 'https://file4.batdongsan.com.vn/2025/06/30/20250630135527-e3db_wm.jpg',
        aiHint: 'luxury apartment',
    },
    {
        address: 'Midtown Phú Mỹ Hưng, Đường số 16, Quận 7',
        price: 14500000000,
        area: 110,
        beds: 2,
        baths: 2,
        image: 'https://file4.batdongsan.com.vn/2025/04/24/20250424084827-4010_wm.jpg',
        aiHint: 'modern residence',
    },
    {
        address: 'Empire City, Mai Chí Thọ, Thủ Thiêm, TP. Thủ Đức',
        price: 18500000000,
        area: 140,
        beds: 3,
        baths: 3,
        image: 'https://file4.batdongsan.com.vn/2025/06/30/20250630133642-c0ce_wm.jpg',
        aiHint: 'riverside apartment',
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
