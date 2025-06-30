'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';

const chartData = [
    { month: 'T1', price: 65 },
    { month: 'T2', price: 66 },
    { month: 'T3', price: 68 },
    { month: 'T4', price: 67 },
    { month: 'T5', price: 70 },
    { month: 'T6', price: 72 },
    { month: 'T7', price: 73 },
    { month: 'T8', price: 75 },
    { month: 'T9', price: 76 },
    { month: 'T10', price: 78 },
    { month: 'T11', price: 80 },
    { month: 'T12', price: 82 },
];

const chartConfig = {
  price: {
    label: 'Giá/m²',
    color: 'hsl(var(--primary))',
  },
};

const formatTooltipValue = (value: number) => {
    return `${new Intl.NumberFormat('vi-VN').format(value * 1000000)}/m²`;
}


export function PriceTrendChart() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
      setIsMounted(true);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Phân tích Xu hướng giá</CardTitle>
        <CardDescription>Đơn giá/m² trong khu vực (12 tháng qua)</CardDescription>
      </CardHeader>
      <CardContent>
      {isMounted ? (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={chartData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}tr`}
             />
            <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                    indicator="dot" 
                    formatter={(value) => formatTooltipValue(value as number)}
                />} />
            <Line
              dataKey="price"
              type="monotone"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      ) : (
          <Skeleton className="h-48 w-full" />
      )}
      </CardContent>
    </Card>
  );
}
