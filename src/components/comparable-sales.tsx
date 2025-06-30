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
        image: 'https://masteriwaterfrontoceanpark.com/wp-content/uploads/2023/08/phong-khach-can-ho-master-waterfront.jpg',
        aiHint: 'luxury apartment',
    },
    {
        address: 'Midtown Phú Mỹ Hưng, Đường số 16, Quận 7',
        price: 14500000000,
        area: 110,
        beds: 2,
        baths: 2,
        image: 'https://masterihomes.com.vn/wp-content/uploads/2021/05/can-ho-mau-masteri-centre-point-18.jpg',
        aiHint: 'modern residence',
    },
    {
        address: 'Empire City, Mai Chí Thọ, Thủ Thiêm, TP. Thủ Đức',
        price: 18500000000,
        area: 140,
        beds: 3,
        baths: 3,
        image: 'https://masterisevietnam.com/wp-content/uploads/2021/06/phong-bep-1-ngu-masteri-west-heights.jpg',
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
