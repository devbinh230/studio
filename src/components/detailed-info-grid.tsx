'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  ShoppingCart,
  ScrollText,
  ShieldCheck,
  Construction,
} from 'lucide-react';
import type { SummaryDetails, SummaryResult } from '@/lib/types';

type DetailedInfoGridProps = {
  summary: SummaryResult;
  details: SummaryDetails;
};

const criteriaConfig = [
  {
    key: 'location',
    title: 'Location',
    icon: MapPin,
  },
  {
    key: 'utilities',
    title: 'Utilities',
    icon: ShoppingCart,
  },
  {
    key: 'planning',
    title: 'Planning',
    icon: ScrollText,
  },
  {
    key: 'legal',
    title: 'Legal',
    icon: ShieldCheck,
  },
  {
    key: 'quality',
    title: 'Quality',
    icon: Construction,
  },
] as const;

export function DetailedInfoGrid({ summary, details }: DetailedInfoGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">AI-Generated Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6">{summary.summary}</p>
        <div className="grid grid-cols-1 gap-4">
          {criteriaConfig.map((item) => {
            const detailItem = details[item.key];
            return (
              <div key={item.key} className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold">{item.title} (Score: {detailItem.score}/10)</h4>
                  <p className="text-sm text-muted-foreground">
                    {detailItem.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
