'use client';

import { useState } from 'react';
import { InteractiveMapSimple } from '@/components/interactive-map-simple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { getDefaultAuthToken } from '@/lib/config';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
}

export default function MapDemoPage() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [authToken, setAuthToken] = useState(getDefaultAuthToken());
  const [valuationResult, setValuationResult] = useState<any>(null);

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    setValuationResult(null); // Clear previous results
    console.log('Selected location:', location);
  };

  const handleManualValuation = async () => {
    if (!selectedLocation || !authToken) {
      alert('Vui lòng chọn vị trí và cung cấp auth token');
      return;
    }

    try {
      const response = await fetch('/api/complete-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          property_details: {
            type: 'town_house',
            landArea: 60.0,
            houseArea: 55.0,
            bedRoom: 3,
            bathRoom: 2,
            legal: 'pink_book',
          },
          auth_token: authToken,
        }),
      });

      const data = await response.json();
      setValuationResult(data);
    } catch (error) {
      console.error('Valuation error:', error);
      alert('Lỗi khi thực hiện định giá');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Interactive Map Demo - Định giá Bất động sản</h1>
        <p className="text-gray-600">
          Demo tính năng bản đồ tương tác sử dụng Geoapify để chọn vị trí và thực hiện định giá bất động sản.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="xl:col-span-2">
          <InteractiveMapSimple
            onLocationSelect={handleLocationSelect}
            authToken={authToken}
            showValuationButton={true}
          />
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Auth Token Input */}
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình API</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token</Label>
                <Textarea
                  id="authToken"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Nhập Bearer token..."
                  className="h-20 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Location */}
          {selectedLocation && (
            <Card>
              <CardHeader>
                <CardTitle>Vị trí đã chọn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedLocation.address && (
                  <div>
                    <Label className="text-sm font-medium">Địa chỉ</Label>
                    <p className="text-sm text-gray-700">{selectedLocation.address}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium">Tọa độ</Label>
                  <p className="text-sm text-gray-700">
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>

                {selectedLocation.city && (
                  <div>
                    <Label className="text-sm font-medium">Khu vực</Label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      <Badge variant="secondary">{selectedLocation.city}</Badge>
                      {selectedLocation.district && <Badge variant="secondary">{selectedLocation.district}</Badge>}
                      {selectedLocation.ward && <Badge variant="secondary">{selectedLocation.ward}</Badge>}
                    </div>
                  </div>
                )}

                <Separator />

                <Button 
                  onClick={handleManualValuation}
                  className="w-full"
                  disabled={!authToken}
                >
                  Thực hiện định giá thủ công
                </Button>
              </CardContent>
            </Card>
          )}

          {/* API Features */}
          <Card>
            <CardHeader>
              <CardTitle>Tính năng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Tìm kiếm địa chỉ bằng Geoapify Geocoding API</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Lấy vị trí hiện tại bằng browser geolocation</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Hiển thị bản đồ static với marker</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Bản đồ Leaflet tương tác với click trực tiếp</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Tích hợp với API định giá bất động sản</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Các nút chọn nhanh địa điểm phổ biến</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">🔄</span>
                  <span>Lấy thông tin địa chỉ từ tọa độ (Resta.vn API)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">🔄</span>
                  <span>Toast notifications cho feedback</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Hướng dẫn sử dụng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>1.</strong> Chọn mode Static hoặc Interactive</p>
                <p><strong>2.</strong> Click trực tiếp trên bản đồ (Interactive mode)</p>
                <p><strong>3.</strong> Tìm kiếm địa chỉ trong ô search</p>
                <p><strong>4.</strong> Hoặc nhấn "Vị trí hiện tại" để dùng GPS</p>
                <p><strong>5.</strong> Hoặc click vào các nút chọn nhanh</p>
                <p><strong>6.</strong> Nhấn "Định giá tại vị trí này" để thực hiện định giá</p>
                <p><strong>7.</strong> Kết quả sẽ hiển thị trong console và toast</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Valuation Result */}
      {valuationResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Kết quả định giá</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
              {JSON.stringify(valuationResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 