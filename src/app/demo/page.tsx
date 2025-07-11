import { getValuationAndSummary } from '@/app/actions';
import { ValuationDisplay } from '@/components/valuation-display';
import { MarketComparisonChart } from '@/components/market-comparison-chart';
import { PriceTrendChart } from '@/components/price-trend-chart';
import { ScoringRadarChart } from '@/components/scoring-radar-chart';
import { DetailedInfoGrid } from '@/components/detailed-info-grid';
import { MapView } from '@/components/map-view';
import { ComparableSales } from '@/components/comparable-sales';

export default async function DemoPage() {
  // Mock data for the demo page, as if it was submitted through the form
  const mockPropertyInput = {
    address: '21°01\'41.9"N 105°51\'14.4"E, Phường Lý Thái Tổ, Quận Hoàn Kiếm, Hà Nội',
    type: 'lane_house' as const,
    houseArea: 33,
    landArea: 33,
    facadeWidth: 3,
    laneWidth: 3,
    storyNumber: 4,
    bedrooms: 3,
    bathrooms: 2,
    legal: 'contract' as const,
  };

  const result = await getValuationAndSummary(mockPropertyInput);
  
  if (!result.success) {
    return <p className="text-destructive text-center p-8">Không thể tải dữ liệu demo: {result.error}</p>;
  }

  const { data } = result;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold font-headline text-primary">
              EstateValuate (Bản Demo)
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-8">
            <div className="space-y-8">
              <ValuationDisplay valuation={data.valuation} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MarketComparisonChart
                  yourValue={data.valuation.reasonableValue}
                />
                <PriceTrendChart />
              </div>
              <DetailedInfoGrid
                summary={data.summary}
                details={data.summaryDetails}
              />
            </div>
          </section>

          <aside className="lg:col-span-1 space-y-8">
            <ScoringRadarChart details={data.summaryDetails} />
            <MapView />
            <ComparableSales />
          </aside>
        </div>
      </main>
    </div>
  );
}
