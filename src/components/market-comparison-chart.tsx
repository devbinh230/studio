'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
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

type MarketComparisonChartProps = {
  yourValue: number;
};

export function MarketComparisonChart({ yourValue }: MarketComparisonChartProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const marketAverage = yourValue * 1.05; // Mock data: market is 5% higher

    const chartData = [
      { name: "Your Value", value: yourValue, fill: "hsl(var(--primary))" },
      { name: "Market Avg.", value: marketAverage, fill: "hsl(var(--accent))" },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Market Comparison</CardTitle>
        <CardDescription>
          Your property's value versus the local market average.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isMounted ? (
            <ChartContainer config={{}} className="h-48 w-full">
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                    <CartesianGrid vertical={false} />
                    <YAxis
                        type="number"
                        hide
                    />
                    <XAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ChartContainer>
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
      </CardContent>
    </Card>
  );
}
