'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ValuationResult } from '@/lib/types';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';

type ValuationDisplayProps = {
  valuation: ValuationResult;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value);
};

export function ValuationDisplay({ valuation }: ValuationDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 items-center text-center divide-x">
          <div className="flex flex-col items-center gap-1 px-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-chart-3" />
              Giá tham khảo thấp
            </h3>
            <p className="text-xl md:text-2xl font-bold text-chart-3">
              {isMounted ? formatCurrency(valuation.lowValue) : '...'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 px-4">
            <h3 className="text-base font-semibold text-primary flex items-center gap-1">
              <DollarSign className="h-5 w-5" />
              Giá trị hợp lý
            </h3>
            <p className="text-3xl md:text-5xl font-bold font-headline text-primary">
              {isMounted ? formatCurrency(valuation.reasonableValue) : '...'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 px-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              Giá tham khảo cao
            </h3>
            <p className="text-xl md:text-2xl font-bold text-chart-2">
              {isMounted ? formatCurrency(valuation.highValue) : '...'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
