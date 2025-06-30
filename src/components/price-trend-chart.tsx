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
    { month: 'Jan', price: 250 },
    { month: 'Feb', price: 255 },
    { month: 'Mar', price: 260 },
    { month: 'Apr', price: 258 },
    { month: 'May', price: 265 },
    { month: 'Jun', price: 270 },
    { month: 'Jul', price: 275 },
    { month: 'Aug', price: 280 },
    { month: 'Sep', price: 282 },
    { month: 'Oct', price: 285 },
    { month: 'Nov', price: 290 },
    { month: 'Dec', price: 295 },
];

const chartConfig = {
  price: {
    label: 'Price/sq ft',
    color: 'hsl(var(--primary))',
  },
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}


export function PriceTrendChart() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
      setIsMounted(true);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Price Trend Analysis</CardTitle>
        <CardDescription>Price per sq. ft. in the vicinity (last 12 months)</CardDescription>
      </CardHeader>
      <CardContent>
      {isMounted ? (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
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
                tickFormatter={(value) => `$${value}`}
             />
            <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                    indicator="dot" 
                    formatter={(value) => `${formatCurrency(value as number)}/sq ft`}
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
