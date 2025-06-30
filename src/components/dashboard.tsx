'use client';

import { useState } from 'react';
import { PropertyInputForm } from '@/components/property-input-form';
import { ValuationDisplay } from '@/components/valuation-display';
import { MarketComparisonChart } from '@/components/market-comparison-chart';
import { PriceTrendChart } from '@/components/price-trend-chart';
import { ScoringRadarChart } from '@/components/scoring-radar-chart';
import { DetailedInfoGrid } from '@/components/detailed-info-grid';
import { MapView } from '@/components/map-view';
import { ComparableSales } from '@/components/comparable-sales';
import type { CombinedResult } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function Dashboard() {
  const [result, setResult] = useState<CombinedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValuation = (data: CombinedResult) => {
    setResult(data);
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold font-headline text-primary">
              EstateValuate
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-8">
            <PropertyInputForm
              setResult={handleValuation}
              setIsLoading={setIsLoading}
              setError={setError}
            />

            {isLoading && <LoadingState />}
            {error && <p className="text-destructive text-center">{error}</p>}

            {result && (
              <div className="space-y-8">
                <ValuationDisplay valuation={result.valuation} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <MarketComparisonChart
                    yourValue={result.valuation.reasonableValue}
                  />
                  <PriceTrendChart />
                </div>
                <DetailedInfoGrid
                  summary={result.summary}
                  details={result.summaryDetails}
                />
              </div>
            )}
          </section>

          <aside className="lg:col-span-1 space-y-8">
            {result ? (
              <>
                <ScoringRadarChart details={result.summaryDetails} />
                <MapView />
                <ComparableSales />
              </>
            ) : (
             !isLoading && (
                <div className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-headline">Bắt đầu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Nhập thông tin chi tiết về bất động sản của bạn vào biểu mẫu bên trái để nhận phân tích và định giá do AI cung cấp.</p>
                    </CardContent>
                  </Card>
                </div>
              )
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

const LoadingState = () => (
  <div className="space-y-8">
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex flex-col items-center gap-2 border-x px-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);
