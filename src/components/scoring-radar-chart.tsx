'use client';

import { PolarGrid, PolarAngleAxis, Radar, RadarChart, PolarRadiusAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import type { SummaryDetails } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';

type ScoringRadarChartProps = {
  details: SummaryDetails;
};

export function ScoringRadarChart({ details }: ScoringRadarChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = [
    { criterion: 'Vị trí', score: details.location.score },
    { criterion: 'Tiện ích', score: details.utilities.score },
    { criterion: 'Quy hoạch', score: details.planning.score },
    { criterion: 'Pháp lý', score: details.legal.score },
    { criterion: 'Chất lượng', score: details.quality.score },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Chấm điểm Đa tiêu chí</CardTitle>
        <CardDescription>
          Góc nhìn trực quan về điểm mạnh và yếu của bất động sản.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        {isMounted ? (
          <ChartContainer
            config={{
              score: {
                label: 'Điểm',
                color: 'hsl(var(--accent))',
              },
            }}
            className="mx-auto aspect-square h-64"
          >
            <RadarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                bottom: 10,
                left: 10,
              }}
            >
              <PolarGrid gridType="polygon" />
              <PolarAngleAxis dataKey="criterion" />
              <PolarRadiusAxis angle={90} domain={[0, 10]} axisLine={false} tick={false}/>
              <Radar
                dataKey="score"
                fill="hsl(var(--accent))"
                fillOpacity={0.6}
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{
                  r: 4,
                  fillOpacity: 1,
                }}
              />
            </RadarChart>
          </ChartContainer>
        ) : (
          <div className="mx-auto aspect-square h-64 flex items-center justify-center pb-6">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
