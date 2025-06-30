'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Star,
  Building,
  Ruler,
  Calendar,
  Navigation,
  Target
} from 'lucide-react';

interface ValuationResultProps {
  data: any;
}

export function ValuationResultDisplay({ data }: ValuationResultProps) {
  if (!data?.valuation_result?.evaluation) {
    return null;
  }

  const result = data.valuation_result.evaluation;
  const address = result.address;
  const radarScore = result.radarScore;
  const isMockData = data.error && data.error.includes('mock');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  // Tính khoảng giá +/- 10%
  const calculatePriceRange = (basePrice: number) => {
    const minPrice = basePrice * 0.9; // -10%
    const maxPrice = basePrice * 1.1; // +10%
    return { minPrice, maxPrice, basePrice };
  };

  const formatPriceRange = (price: number) => {
    const billions = Math.floor(price / 1000000000);
    const millions = Math.floor((price % 1000000000) / 1000000);
    
    if (billions > 0) {
      if (millions > 0) {
        return `${billions} tỷ ${Math.round(millions / 100) * 100 / 1000} triệu`;
      }
      return `${billions} tỷ`;
    } else {
      return `${Math.round(millions / 100) * 100} triệu`;
    }
  };

  const getPropertyType = (type: string) => {
    const types: Record<string, string> = {
      'town_house': 'Nhà phố',
      'apartment': 'Chung cư',
      'villa': 'Biệt thự',
      'house': 'Nhà riêng'
    };
    return types[type] || type;
  };

  const getDistrictName = (district: string) => {
    const districts: Record<string, string> = {
      'cau_giay': 'Cầu Giấy',
      'dong_da': 'Đống Đa',
      'ba_dinh': 'Ba Đình',
      'hoan_kiem': 'Hoàn Kiếm',
      'hai_ba_trung': 'Hai Bà Trưng',
      'thanh_xuan': 'Thanh Xuân'
    };
    return districts[district] || district.replace('_', ' ');
  };

  const getCityName = (city: string) => {
    const cities: Record<string, string> = {
      'ha_noi': 'Hà Nội',
      'ho_chi_minh': 'TP. Hồ Chí Minh',
      'da_nang': 'Đà Nẵng'
    };
    return cities[city] || city.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      {/* Mock Data Warning */}
      {isMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-yellow-800 font-medium">Dữ liệu mẫu</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Kết quả này sử dụng dữ liệu mẫu do vấn đề kết nối API. Vui lòng thử lại sau.
          </p>
        </div>
      )}

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Kết quả định giá bất động sản
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Tổng giá trị</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(result.totalPrice)}
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Giá nhà</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(result.housePrice)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <Home className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-gray-600">Loại</p>
              <p className="font-semibold">{getPropertyType(result.type)}</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <Ruler className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-gray-600">DT Đất</p>
              <p className="font-semibold">{result.landArea}m²</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <Building className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-xs text-gray-600">DT Nhà</p>
              <p className="font-semibold">{result.houseArea}m²</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-xs text-gray-600">Năm</p>
              <p className="font-semibold">{result.year}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Range Suggestion Card */}
      {(() => {
        const totalPriceRange = calculatePriceRange(result.totalPrice);
        const housePriceRange = calculatePriceRange(result.housePrice);
        
        return (
          <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                💰 Gợi ý giá bán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Single Price Range Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-green-600">
                    {formatPriceRange(totalPriceRange.minPrice)}
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatPriceRange(totalPriceRange.maxPrice)}
                  </span>
                </div>
                
                {/* Price Range Slider */}
                <div className="relative px-2">
                  <div className="flex h-4 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full">
                    <div className="w-1/2 relative">
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs font-medium text-center">
                        <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                          {formatPriceRange(totalPriceRange.basePrice)}
                        </div>
                        <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-blue-600 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex justify-between text-sm text-gray-600 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                    <span>Khoảng giá giúp bán nhanh hơn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                    <span>Khoảng giá có thể chậm hơn đôi chút</span>
                  </div>
                </div>
              </div>

              {/* Suggestion Box */}
              <div className="bg-white/70 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">💡 Gợi ý từ AI</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Giá trong khoảng <strong className="text-green-600">{formatPriceRange(totalPriceRange.minPrice)}</strong> đến <strong className="text-blue-600">{formatPriceRange(totalPriceRange.basePrice)}</strong> sẽ giúp bán nhanh hơn. 
                      Giá từ <strong className="text-blue-600">{formatPriceRange(totalPriceRange.basePrice)}</strong> đến <strong className="text-red-600">{formatPriceRange(totalPriceRange.maxPrice)}</strong> có thể đạt được nhưng thời gian bán sẽ lâu hơn.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Thông tin vị trí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Thành phố:</span>
                <Badge variant="secondary">{getCityName(address.city)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quận/Huyện:</span>
                <Badge variant="secondary">{getDistrictName(address.district)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phường/Xã:</span>
                <Badge variant="outline">{address.ward.replace('_', ' ')}</Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khoảng cách trung tâm TP:</span>
                <span className="font-medium">{result.cityCenterDistance.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khoảng cách trung tâm quận:</span>
                <span className="font-medium">{result.districtCenterDistance.toFixed(1)} km</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Đánh giá chi tiết
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Điểm vị trí</span>
                  <span className="font-semibold text-blue-600">{radarScore.locationScore}/10</span>
                </div>
                <Progress value={radarScore.locationScore * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Điểm pháp lý</span>
                  <span className="font-semibold text-green-600">{radarScore.legalityScore}/10</span>
                </div>
                <Progress value={radarScore.legalityScore * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Điểm thanh khoản</span>
                  <span className="font-semibold text-orange-600">{radarScore.liquidityScore}/10</span>
                </div>
                <Progress value={radarScore.liquidityScore * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Tiềm năng sinh lời</span>
                  <span className="font-semibold text-purple-600">{radarScore.dividendScore}/10</span>
                </div>
                <Progress value={radarScore.dividendScore * 10} className="h-2" />
              </div>
              
              <Separator />
              
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Điểm tổng quan:</span>
                  <span className="text-xl font-bold text-primary">
                    {radarScore.evaluationScore}/10
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Đặc điểm bất động sản
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Phòng ngủ</p>
              <p className="text-lg font-semibold">{result.bedRoom}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Phòng tắm</p>
              <p className="text-lg font-semibold">{result.bathRoom}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Số tầng</p>
              <p className="text-lg font-semibold">{result.storyNumber}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Mặt tiền</p>
              <p className="text-lg font-semibold">{result.facadeWidth}m</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Lề đường</p>
              <p className="text-lg font-semibold">{result.laneWidth}m</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Pháp lý</p>
              <Badge variant="outline" className="text-xs">
                {result.legal === 'pink_book' ? 'Sổ hồng' : result.legal}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {radarScore.descriptions && radarScore.descriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Phân tích từ AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {radarScore.descriptions.map((desc: string, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
                  <p className="text-sm text-gray-700 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex flex-wrap justify-between items-center text-sm text-gray-600">
            <span>Transaction ID: {result.transId}</span>
            <span>Ngày tạo: {new Date(result.createdDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 