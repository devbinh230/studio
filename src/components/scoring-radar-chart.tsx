'use client';

import { PolarGrid, PolarAngleAxis, Radar, RadarChart } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { SummaryDetails } from '@/lib/types';

type ScoringRadarChartProps = {
  details: SummaryDetails;
}

export function ScoringRadarChart({details}: ScoringRadarChartProps) {
    const chartData = [
        { criterion: 'Location', score: details.location.score },
        { criterion: 'Utilities', score: details.utilities.score },
        { criterion: 'Planning', score: details.planning.score },
        { criterion: 'Legal', score: details.legal.score },
        { criterion: 'Quality', score: details.quality.score },
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Multi-criteria Scoring</CardTitle>
        <CardDescription>
          An intuitive view of the property's strengths and weaknesses.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={{
            score: {
              label: 'Score',
              color: 'hsl(var(--accent))',
            },
          }}
          className="mx-auto aspect-square h-64"
        >
          <RadarChart data={chartData}
            margin={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            }}>
            <PolarGrid gridType='polygon' />
            <PolarAngleAxis dataKey="criterion" />
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
      </CardContent>
    </Card>
  );
}
