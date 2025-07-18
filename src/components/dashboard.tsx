'use client';

import { useState, useEffect } from 'react';
import { PropertyInputForm } from '@/components/property-input-form';
import { ValuationDisplay } from '@/components/valuation-display';
import { ValuationResultDisplay } from '@/components/valuation-result-display';
import { MarketComparisonChart } from '@/components/market-comparison-chart';
import { PriceTrendChart } from '@/components/price-trend-chart';
import { DetailedInfoGrid } from '@/components/detailed-info-grid';
import { MapView } from '@/components/map-view';
import { ComparableSales } from '@/components/comparable-sales';
import { InteractiveMapSimple } from '@/components/interactive-map-simple';
import { RightPanelValuation } from '@/components/right-panel-valuation';
import { RightPanelRadarChart } from '@/components/right-panel-radar-chart';
import { UtilitiesInteractiveMap } from '@/components/utilities-interactive-map';
import dynamic from 'next/dynamic';

const HanoiPlanningMap = dynamic(() => import('@/components/hanoi-planning-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Đang tải bản đồ quy hoạch...</p>
    </div>
  )
});
import { Header } from '@/components/ui/header';
import type { CombinedResult } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Home, TrendingUp, CheckCircle, Info, Map, ExternalLink, Globe } from 'lucide-react';

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
  const [areaPrices, setAreaPrices] = useState<Record<string, string> | null>(null);

  // Fetch area prices whenever we have a result (after valuation)
  useEffect(() => {
    if (!result) return;

    let lat: number | undefined, lng: number | undefined;
    const anyResult = result as any;

    if (anyResult.input_data?.coordinates && Array.isArray(anyResult.input_data.coordinates) && anyResult.input_data.coordinates.length === 2) {
      lat = anyResult.input_data.coordinates[0];
      lng = anyResult.input_data.coordinates[1];
    } else if (anyResult.valuation_payload?.geoLocation && Array.isArray(anyResult.valuation_payload.geoLocation) && anyResult.valuation_payload.geoLocation.length === 2) {
      lng = anyResult.valuation_payload.geoLocation[0];
      lat = anyResult.valuation_payload.geoLocation[1];
    } else if (anyResult.valuation_result?.evaluation?.geoLocation && Array.isArray(anyResult.valuation_result.evaluation.geoLocation) && anyResult.valuation_result.evaluation.geoLocation.length === 2) {
      lng = anyResult.valuation_result.evaluation.geoLocation[0];
      lat = anyResult.valuation_result.evaluation.geoLocation[1];
    }

    if (lat && lng) {
      fetch(`/api/area-prices?lat=${lat}&lng=${lng}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setAreaPrices(json.data);
          }
        })
        .catch(err => console.error('Fetch area prices error:', err));
    }
  }, [result]);

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
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header 
        onNewSearch={handleNewSearch}
        showNewSearchButton={!!(result || selectedLocation)}
      />

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-8">
            {/* Selected Location Display */}
            {selectedLocation && (
              <Card className="professional-card border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800">Vị trí đã chọn</h3>
                      </div>
                      {selectedLocation.address && (
                        <p className="text-sm text-slate-700 mb-3 font-medium">{selectedLocation.address}</p>
                      )}
                      <div className="flex gap-2 flex-wrap mb-3">
                        {selectedLocation.city && <Badge variant="secondary" className="bg-blue-100 text-blue-800">{selectedLocation.city}</Badge>}
                        {selectedLocation.district && <Badge variant="secondary" className="bg-blue-100 text-blue-800">{selectedLocation.district}</Badge>}
                        {selectedLocation.ward && <Badge variant="secondary" className="bg-blue-100 text-blue-800">{selectedLocation.ward}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">
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
            {error && (
              <Card className="professional-card border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
                      <Info className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    
                    {/* Thêm utilities map cho format cũ */}
                    {(() => {
                      let lat, lng;
                      const anyResult = result as any;
                      
                      // Tìm coordinates từ result hoặc selectedLocation
                      if (anyResult.valuation_payload?.geoLocation && anyResult.valuation_payload.geoLocation.length === 2) {
                        lng = anyResult.valuation_payload.geoLocation[0];
                        lat = anyResult.valuation_payload.geoLocation[1];
                      } else if (selectedLocation) {
                        lat = selectedLocation.latitude;
                        lng = selectedLocation.longitude;
                      } else {
                        // Fallback
                        lat = 21.0282993;
                        lng = 105.8539963;
                      }
                      
                      return (
                        <UtilitiesInteractiveMap 
                          latitude={lat} 
                          longitude={lng}
                          distance={5}
                          size={5}
                          utilities={anyResult.utilities}
                        />
                      );
                    })()}
                  </>
                )}

                {/* Bản đồ quy hoạch Hà Nội - Always show for all result formats */}
                <Card className="professional-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl shadow-lg">
                        <Map className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-slate-800">Bản đồ quy hoạch chi tiết</h3>
                        <p className="text-sm text-slate-600 font-normal">
                          Thông tin quy hoạch 2030 và đất đai khu vực
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-2">🗺️ Tính năng bản đồ</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Click vào bản đồ để xem thông tin quy hoạch chi tiết</li>
                          <li>• Chuyển đổi giữa các layer: QH 2030, QH 1/500, QH phân khu</li>
                          <li>• Tìm kiếm địa chỉ và xem thông tin thửa đất</li>
                          <li>• Zoom để xem chi tiết ở mức độ cao</li>
                          <li>• Xem thông tin tiện ích xung quanh</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Location Info - hiển thị tọa độ hiện tại */}
                    {(() => {
                      let lat, lng, locationInfo = 'Trung tâm Hà Nội';
                      const anyResult = result as any;
                      
                      // Tìm coordinates từ result hoặc selectedLocation với thứ tự ưu tiên
                      if (anyResult.valuation_result?.location?.coordinates) {
                        // Định dạng mới: [lng, lat]
                        lng = anyResult.valuation_result.location.coordinates[0];
                        lat = anyResult.valuation_result.location.coordinates[1];
                        locationInfo = anyResult.valuation_result.location?.address || 
                                     anyResult.valuation_result.property?.address || 
                                     'Vị trí được thẩm định';
                      } else if (anyResult.input_data?.coordinates && Array.isArray(anyResult.input_data.coordinates)) {
                        // Input data coordinates: [lat, lng]
                        lat = anyResult.input_data.coordinates[0];
                        lng = anyResult.input_data.coordinates[1];
                        locationInfo = 'Vị trí được thẩm định';
                      } else if (anyResult.valuation_payload?.geoLocation && anyResult.valuation_payload.geoLocation.length === 2) {
                        // Định dạng cũ: [lng, lat]
                        lng = anyResult.valuation_payload.geoLocation[0];
                        lat = anyResult.valuation_payload.geoLocation[1];
                        locationInfo = anyResult.inputData?.location || 
                                     anyResult.valuation?.property?.address ||
                                     'Vị trí được thẩm định';
                      } else if (selectedLocation) {
                        // Từ selected location: [lat, lng]
                        lat = selectedLocation.latitude;
                        lng = selectedLocation.longitude;
                        locationInfo = selectedLocation.address || 
                                     `${selectedLocation.ward || ''} ${selectedLocation.district || ''} ${selectedLocation.city || ''}`.trim() ||
                                     'Vị trí đã chọn';
                      } else {
                        // Fallback: trung tâm Hà Nội
                        lat = 21.0285;
                        lng = 105.8542;
                        locationInfo = 'Trung tâm Hà Nội (mặc định)';
                      }
                      
                      return (
                        <>
                          {/* Interactive Map */}
                          <div className="rounded-lg overflow-hidden border border-green-200 shadow-lg">
                            <HanoiPlanningMap
                              height="600px"
                              showControls={true}
                              className="planning-map-container"
                              baseMapType="google-hybrid"
                              initialLat={lat}
                              initialLng={lng}
                              initialZoom={16}
                              autoClickOnLoad={true}
                              showHanoiLandLayer={lat >= 20.8 && lat <= 21.4 && lng >= 105.3 && lng <= 106.0}
                            />
                          </div>
                          
                          {/* Property Info Overlay */}
                          <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">Thông tin BDS được thẩm định</span>
                            </div>
                            {(() => {
                              // Extract property info from result
                              const anyResult = result as any;
                              let propertyInfo = null;
                              
                              if (anyResult.valuation_result?.property) {
                                propertyInfo = anyResult.valuation_result.property;
                              } else if (anyResult.valuation_result?.evaluation) {
                                propertyInfo = anyResult.valuation_result.evaluation;
                              } else if (anyResult.valuation?.property) {
                                propertyInfo = anyResult.valuation.property;
                              } else if (anyResult.inputData) {
                                propertyInfo = anyResult.inputData;
                              }
                              
                              return propertyInfo ? (
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {(propertyInfo.area || propertyInfo.landArea) && (
                                    <div>
                                      <span className="text-slate-600">Diện tích:</span>
                                      <span className="ml-1 font-medium text-slate-800">{propertyInfo.area || propertyInfo.landArea}m²</span>
                                    </div>
                                  )}
                                  {(propertyInfo.floors || propertyInfo.storyNumber) && (
                                    <div>
                                      <span className="text-slate-600">Số tầng:</span>
                                      <span className="ml-1 font-medium text-slate-800">{propertyInfo.floors || propertyInfo.storyNumber}</span>
                                    </div>
                                  )}
                                  {(propertyInfo.yearBuilt || propertyInfo.year) && (
                                    <div>
                                      <span className="text-slate-600">Năm xây:</span>
                                      <span className="ml-1 font-medium text-slate-800">{propertyInfo.yearBuilt || propertyInfo.year}</span>
                                    </div>
                                  )}
                                  {(propertyInfo.propertyType || propertyInfo.type) && (
                                    <div>
                                      <span className="text-slate-600">Loại hình:</span>
                                      <span className="ml-1 font-medium text-slate-800">{propertyInfo.propertyType || propertyInfo.type}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-600">Thông tin BDS được hiển thị trên bản đồ tại tọa độ đã chọn</p>
                              );
                            })()}
                          </div>
                        </>
                      );
                    })()} 
                  </CardContent>
                </Card>
                
                {/* Sources Section */}
                {(() => {
                  const anyResult = result as any;
                  const sources = anyResult?.search_sources || [];
                  
                  if (sources.length === 0) return null;
                  
                  return (
                    <Card className="professional-card bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl shadow-lg">
                            <Globe className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-slate-800">Nguồn tham khảo</h3>
                            <p className="text-sm text-slate-600 font-normal">
                              Dữ liệu từ {sources.length} nguồn thông tin
                            </p>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700">
                              📊 Thông tin thị trường được tổng hợp từ các trang web bất động sản uy tín và tin rao bán thực tế.
                            </p>
                          </div>
                          
                          <div className="grid gap-2 max-h-60 overflow-y-auto">
                            {sources.map((source: string, index: number) => {
                              // Clean trailing backslashes from URL
                              const cleanUrl = source.replace(/\\+$/, '');
                              
                              // Extract domain name for display
                              let displayName = cleanUrl;
                              try {
                                const url = new URL(cleanUrl);
                                displayName = url.hostname.replace('www.', '');
                              } catch (e) {
                                // Keep original if URL parsing fails
                              }
                              
                              return (
                                <a
                                  key={index}
                                  href={cleanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
                                >
                                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                                    <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-slate-800" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
                                      {displayName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {cleanUrl}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-slate-100">
                                    #{index + 1}
                                  </Badge>
                                </a>
                              );
                            })}
                          </div>
                          
                          <div className="text-center pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                              Dữ liệu được cập nhật từ AI Search • {new Date().toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Area Prices Card - moved from ValuationResultDisplay */}
                {areaPrices && (() => {
                  const items = Object.entries(areaPrices as Record<string,string>).filter(([k]) => {
                    const lower = k.toLowerCase();
                    // Loại bỏ các mục thống kê tổng quan, chỉ giữ thông tin đường/hẻm
                    if (k.startsWith('Giá trị định giá')) return false;
                    if (lower.includes('giá đất')) return false;
                    if (lower.includes('trung bình') || lower.includes('cao nhất') || lower.includes('thấp nhất')) return false;
                    if (k === 'Thay đổi') return false;
                    return true; // Giữ lại các mục đường, hẻm, ngõ...
                  }) as [string, string][];
                  if (items.length === 0) return null;
                  return (
                    <Card className="professional-card bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg">
                            <MapPin className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-slate-800">Giá khu vực xung quanh</h3>
                            <p className="text-sm text-slate-600 font-normal">Dữ liệu thu thập</p>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                          {items.map(([name, price], idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all">
                              <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                                <MapPin className="h-4 w-4 text-slate-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                                <p className="text-xs text-slate-500 truncate">{price}</p>
                              </div>
                              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">#{idx + 1}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
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
                
                {/* Getting Started Guide */}
                <Card className="professional-card bg-gradient-to-br from-slate-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
                        <Home className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-slate-800">Hướng dẫn sử dụng</h3>
                        <p className="text-sm text-slate-600 font-normal">Các bước thực hiện</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg text-blue-700 font-semibold text-sm">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">Chọn vị trí trên bản đồ</p>
                          <p className="text-xs text-slate-600 mt-1">Hoặc tìm kiếm địa chỉ cụ thể</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg text-blue-700 font-semibold text-sm">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">Nhập thông tin bất động sản</p>
                          <p className="text-xs text-slate-600 mt-1">Diện tích, loại hình, năm xây dựng</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg text-emerald-700 font-semibold text-sm">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">Nhận kết quả định giá AI</p>
                          <p className="text-xs text-slate-600 mt-1">Phân tích chi tiết và gợi ý giá bán</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : result ? (
              <>
                {/* Right Panel - Professional Valuation Results */}
                <div className="lg:sticky lg:top-20 space-y-6">
                  {/* Định giá bất động sản */}
                  <RightPanelValuation result={result} />
                  
                  {/* Chấm điểm đa tiêu chí */}
                  <RightPanelRadarChart result={result} />
                  
                  {/* Bất động sản tương đương */}
                  <ComparableSales result={result} />
                </div>
              </>
            ) : (
              !isLoading && (
                <div className="space-y-8">
                  <Card className="professional-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg shadow-sm">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-slate-800">Sẵn sàng bắt đầu</h3>
                          <p className="text-sm text-slate-600 font-normal">Định giá chuyên nghiệp</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 leading-relaxed">
                        Nhập thông tin chi tiết về bất động sản của bạn để nhận phân tích 
                        và định giá chính xác từ hệ thống AI tiên tiến.
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
  <div className="space-y-6">
    <Card className="professional-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg animate-pulse">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-32" />
      </CardContent>
    </Card>
  </div>
);
