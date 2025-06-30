'use client';

import { useState } from 'react';
import { PropertyInputForm } from '@/components/property-input-form';
import { ValuationDisplay } from '@/components/valuation-display';
import { ValuationResultDisplay } from '@/components/valuation-result-display';
import { MarketComparisonChart } from '@/components/market-comparison-chart';
import { PriceTrendChart } from '@/components/price-trend-chart';
import { ScoringRadarChart } from '@/components/scoring-radar-chart';
import { DetailedInfoGrid } from '@/components/detailed-info-grid';
import { MapView } from '@/components/map-view';
import { ComparableSales } from '@/components/comparable-sales';
import { InteractiveMapSimple } from '@/components/interactive-map-simple';
import type { CombinedResult } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
}

export default function Dashboard() {
  const [result, setResult] = useState<CombinedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showMap, setShowMap] = useState(true); // Show map by default

  const handleValuation = (data: CombinedResult | null) => {
    if (data) {
      setResult(data);
      setError(null);
      setShowMap(false); // Hide map when results are shown
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    // Clear previous results when new location is selected
    setResult(null);
    setError(null);
  };

  const handleNewSearch = () => {
    setResult(null);
    setError(null);
    setShowMap(true);
    setSelectedLocation(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold font-headline text-primary">
              EstateValuate
            </h1>
            {(result || selectedLocation) && (
              <button
                onClick={handleNewSearch}
                className="text-sm text-primary hover:underline"
              >
                🔍 Tìm kiếm mới
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-8">
            {/* Selected Location Display */}
            {selectedLocation && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">📍 Vị trí đã chọn</h3>
                      {selectedLocation.address && (
                        <p className="text-sm text-gray-700 mb-2">{selectedLocation.address}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {selectedLocation.city && <Badge variant="secondary">{selectedLocation.city}</Badge>}
                        {selectedLocation.district && <Badge variant="secondary">{selectedLocation.district}</Badge>}
                        {selectedLocation.ward && <Badge variant="secondary">{selectedLocation.ward}</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Tọa độ: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <PropertyInputForm
              setResult={handleValuation}
              setIsLoading={setIsLoading}
              setError={setError}
              selectedLocation={selectedLocation}
              onLocationSelect={handleLocationSelect}
            />

            {isLoading && <LoadingState />}
            {error && <p className="text-destructive text-center">{error}</p>}

            {result && (
              <div className="space-y-8">
                {/* Check if we have API result format or old format */}
                {'valuation_result' in result ? (
                  <ValuationResultDisplay data={result} />
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
          </section>

          <aside className="lg:col-span-1 space-y-8">
            {showMap && !result ? (
              <>
                {/* Interactive Map for Location Selection */}
                <InteractiveMapSimple
                  onLocationSelect={handleLocationSelect}
                  showValuationButton={false}
                  initialLocation={{ lat: 21.0282993, lng: 105.8539963 }}
                  selectedLocation={selectedLocation}
                />
                
                {/* Getting Started Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Hướng dẫn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500">1️⃣</span>
                        <span>Chọn vị trí trên bản đồ hoặc tìm kiếm địa chỉ</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500">2️⃣</span>
                        <span>Nhập thông tin chi tiết bất động sản</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500">3️⃣</span>
                        <span>Nhận kết quả định giá và phân tích AI</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : result ? (
              <>
                {/* Only show radar chart if we have summaryDetails (AI mode) */}
                {'summaryDetails' in result && result.summaryDetails && (
                  <ScoringRadarChart details={result.summaryDetails} />
                )}
                <MapView selectedLocation={selectedLocation} />
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
                      <p className="text-muted-foreground">
                        Nhập thông tin chi tiết về bất động sản của bạn vào biểu mẫu bên trái để nhận phân tích và định giá do AI cung cấp.
                      </p>
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
