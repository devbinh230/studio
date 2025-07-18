'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Home,
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Star,
  Building,
  Ruler,
  Calendar,
  Target,
  AlertTriangle,
  Bed,
  Bath,
  Layers,
  Move,
  Car,
  Shield,
  FileCheck,
  Users,
  Heart,
  Lightbulb,
  Calculator,
  Globe,
  ExternalLink
} from 'lucide-react';
import { UtilitiesInteractiveMap } from '@/components/utilities-interactive-map';
import { PriceTrendChart } from '@/components/price-trend-chart';

interface ValuationResultProps {
  data: any;
}

export function ValuationResultDisplay({ data }: ValuationResultProps) {
  const hasEvaluation = !!data?.valuation_result?.evaluation;

  let result: any = null;
  let address: any = null;
  let radarScore: any = null;
  let isMockData = false;
  let isAIEnhanced = false;

  // Area prices (giá khu vực xung quanh)
  const [areaPrices, setAreaPrices] = React.useState<Record<string, string> | null>(null);

  // Fetch area prices once component is mounted
  React.useEffect(() => {
    let lat: number | undefined, lng: number | undefined;

    if (data.input_data?.coordinates && Array.isArray(data.input_data.coordinates) && data.input_data.coordinates.length === 2) {
      lat = data.input_data.coordinates[0];
      lng = data.input_data.coordinates[1];
    } else if (data.valuation_payload?.geoLocation && Array.isArray(data.valuation_payload.geoLocation) && data.valuation_payload.geoLocation.length === 2) {
      lng = data.valuation_payload.geoLocation[0];
      lat = data.valuation_payload.geoLocation[1];
    } else if (result?.geoLocation && Array.isArray(result.geoLocation) && result.geoLocation.length === 2) {
      lng = result.geoLocation[0];
      lat = result.geoLocation[1];
    } else if (data.valuation_result?.evaluation?.geoLocation && Array.isArray(data.valuation_result.evaluation.geoLocation) && data.valuation_result.evaluation.geoLocation.length === 2) {
      lng = data.valuation_result.evaluation.geoLocation[0];
      lat = data.valuation_result.evaluation.geoLocation[1];
    }

    if (lat && lng) {
      fetch(`/api/area-prices?lat=${lat}&lng=${lng}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setAreaPrices(json.data);
          }
        })
        .catch((err) => console.error('Fetch area prices error:', err));
    }
  }, []);

  if (hasEvaluation) {
    result = {
      ...data.valuation_result.evaluation,
      price_gov_place: data.valuation_result?.price_gov_place ?? data.price_gov_place
    };
    address = result.address;
    radarScore = result.radarScore;
    isMockData = data.error && data.error.includes('mock');
  } else {
    // Fallback to AI valuation & analysis
    const aiValuationData = data.ai_valuation?.result?.valuation ?? data.ai_valuation?.data;
    const propertyInfo = data.ai_valuation?.result?.property_info;
    const radar = data.ai_analysis?.result?.radarScore ?? data.ai_analysis?.data?.radarScore;

    if (!aiValuationData) {
      return null; // no data to render
    }

    isAIEnhanced = true;

    result = {
      totalPrice: aiValuationData.reasonableValue,
      housePrice: aiValuationData.price_house,
      price_gov_place: aiValuationData.price_gov_place,
      landArea: propertyInfo?.specifications?.land_area ?? data.valuation_payload?.landArea ?? 0,
      houseArea: propertyInfo?.specifications?.house_area ?? data.valuation_payload?.houseArea ?? propertyInfo?.specifications?.land_area ?? 0,
      type: propertyInfo?.specifications?.type ?? data.valuation_payload?.type ?? 'lane_house',
      bedRoom: propertyInfo?.specifications?.bedrooms ?? data.valuation_payload?.bedRoom ?? 0,
      bathRoom: propertyInfo?.specifications?.bathrooms ?? data.valuation_payload?.bathRoom ?? 0,
      storyNumber: propertyInfo?.specifications?.story_number ?? data.valuation_payload?.storyNumber ?? 0,
      facadeWidth: propertyInfo?.specifications?.facade_width ?? data.valuation_payload?.facadeWidth ?? 0,
      laneWidth: propertyInfo?.specifications?.lane_width ?? data.valuation_payload?.laneWidth ?? 0,
      legal: propertyInfo?.specifications?.legal ?? data.valuation_payload?.legal ?? 'contract',
      year: propertyInfo?.specifications?.year_built ?? data.valuation_payload?.yearBuilt ?? 2015,
      // Preserve original coordinates for utilities map
      geoLocation: data.input_data?.coordinates ?? data.valuation_payload?.geoLocation
    };

    address = {
      city: propertyInfo?.location?.city ?? data.valuation_payload?.address?.city ?? data.address?.city ?? '',
      district: propertyInfo?.location?.district ?? data.valuation_payload?.address?.district ?? data.address?.district ?? '',
      ward: propertyInfo?.location?.ward ?? data.valuation_payload?.address?.ward ?? data.address?.ward ?? '',
    };

    radarScore = radar ?? {
      locationScore: 0,
      legalityScore: 0,
      liquidityScore: 0,
      evaluationScore: 0,
      dividendScore: 0,
      descriptions: []
    };
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value || isNaN(value) || value <= 0) {
      return 'Chưa có thông tin';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Tính khoảng giá +/- 10%
  const calculatePriceRange = (basePrice: number) => {
    const minPrice = basePrice * 0.9; // -10%
    const maxPrice = basePrice * 1.1; // +10%
    return { minPrice, maxPrice, basePrice };
  };

  const formatPriceRange = (price: number | null | undefined) => {
    if (!price || isNaN(price) || price <= 0) {
      return 'Chưa có thông tin';
    }
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

  const getPropertyType = (type: string | null | undefined) => {
    if (!type) return 'Chưa xác định';
    const types: Record<string, string> = {
      'town_house': 'Nhà phố',
      'apartment': 'Chung cư',
      'villa': 'Biệt thự',
      'house': 'Nhà riêng',
      'lane_house': 'Nhà trong hẻm',
      'land': 'Đất nền',
      'shop_house': 'Nhà mặt tiền'
    };
    return types[type] || type;
  };

  const getDistrictName = (district: string | null | undefined) => {
    if (!district) return '';
    const districts: Record<string, string> = {
      'cau_giay': 'Cầu Giấy',
      'dong_da': 'Đống Đa',
      'ba_dinh': 'Ba Đình',
      'hoan_kiem': 'Hoàn Kiếm',
      'hai_ba_trung': 'Hai Bà Trưng',
      'thanh_xuan': 'Thanh Xuân'
    };
    return districts[district] || district.replace(/_/g, ' ');
  };

  const getCityName = (city: string | null | undefined) => {
    if (!city) return '';
    const cities: Record<string, string> = {
      'ha_noi': 'Hà Nội',
      'ho_chi_minh': 'TP. Hồ Chí Minh',
      'da_nang': 'Đà Nẵng'
    };
    return cities[city] || city.replace(/_/g, ' ');
  };

  // Function to get appropriate icon and category for AI analysis descriptions
  const getAnalysisIconAndCategory = (description: string, index: number) => {
    const desc = description.toLowerCase();
    
    // Lấy 5 từ đầu tiên để ưu tiên ý chính của câu
    const words = desc.split(' ');
    const firstFiveWords = words.slice(0, 5).join(' ');
    
    // PRIORITY CHECK: Kiểm tra 5 từ đầu tiên trước (ưu tiên cao)
    
    // 1. INVESTMENT POTENTIAL (Tiềm năng sinh lời) - AMBER (Check đầu tiên vì quan trọng)
    if (firstFiveWords.includes('tiềm năng') || firstFiveWords.includes('sinh lời') || firstFiveWords.includes('đầu tư') || firstFiveWords.includes('lợi nhuận')) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-amber-600" />,
        category: 'investment',
        categoryName: 'Tiềm năng sinh lời',
        color: 'amber',
        bgClass: 'bg-amber-50', 
        borderClass: 'border-amber-200',
        textClass: 'text-amber-600'
      };
    }
    
    // 2. VALUATION ACCURACY (Định giá) - EMERALD
    if (firstFiveWords.includes('định giá') || firstFiveWords.includes('thẩm định') || firstFiveWords.includes('giá trị')) {
      return {
        icon: <Calculator className="h-4 w-4 text-emerald-600" />,
        category: 'valuation',
        categoryName: 'Định giá',
        color: 'emerald',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200', 
        textClass: 'text-emerald-600'
      };
    }
    
    // 3. LEGAL ANALYSIS (Pháp lý) - GREEN
    if (firstFiveWords.includes('pháp lý') || firstFiveWords.includes('hợp đồng') || firstFiveWords.includes('sổ')) {
      return {
        icon: <Shield className="h-4 w-4 text-green-600" />,
        category: 'legal',
        categoryName: 'Pháp lý',
        color: 'green',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        textClass: 'text-green-600'
      };
    }
    
    // 4. LIQUIDITY ANALYSIS (Thanh khoản) - BLUE  
    if (firstFiveWords.includes('thanh khoản') || firstFiveWords.includes('giao dịch')) {
      return {
        icon: <DollarSign className="h-4 w-4 text-blue-600" />,
        category: 'liquidity', 
        categoryName: 'Thanh khoản',
        color: 'blue',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-600'
      };
    }
    
    // 5. LOCATION ANALYSIS (Vị trí) - PURPLE
    if (firstFiveWords.includes('vị trí') || firstFiveWords.includes('địa điểm') || firstFiveWords.includes('khu vực')) {
      return {
        icon: <MapPin className="h-4 w-4 text-purple-600" />,
        category: 'location',
        categoryName: 'Vị trí', 
        color: 'purple', 
        bgClass: 'bg-purple-50',
        borderClass: 'border-purple-200',
        textClass: 'text-purple-600'
      };
    }
    
    // SECONDARY CHECK: Kiểm tra toàn bộ description nếu không match ở trên
    
    // 1. VALUATION ACCURACY (Định giá) - EMERALD (Ưu tiên cao)
    if (desc.includes('định giá') || desc.includes('thẩm định') || desc.includes('được thẩm định') || desc.includes('giá trị bất động sản') || desc.includes('mức giá') || desc.includes('nằm sát') || desc.includes('giá trung bình') || desc.includes('thị trường hiện tại') || desc.includes('chính xác') || desc.includes('tương đồng')) {
      return {
        icon: <Calculator className="h-4 w-4 text-emerald-600" />,
        category: 'valuation',
        categoryName: 'Định giá',
        color: 'emerald',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200', 
        textClass: 'text-emerald-600'
      };
    }
    
    // 2. LEGAL ANALYSIS (Pháp lý) - GREEN
    if (desc.includes('pháp lý') || desc.includes('hợp đồng') || desc.includes('sổ') || desc.includes('sổ đỏ') || desc.includes('sổ hồng') || desc.includes('đảm bảo') || desc.includes('minh bạch') || desc.includes('chứng nhận') || desc.includes('giấy tờ') || desc.includes('thủ tục') || desc.includes('rủi ro') || desc.includes('quyền sở hữu')) {
      return {
        icon: <Shield className="h-4 w-4 text-green-600" />,
        category: 'legal',
        categoryName: 'Pháp lý',
        color: 'green',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        textClass: 'text-green-600'
      };
    }
    
    // 3. LIQUIDITY ANALYSIS (Thanh khoản) - BLUE  
    if (desc.includes('thanh khoản') || desc.includes('giao dịch') || desc.includes('bán') || desc.includes('mua') || desc.includes('số lượng giao dịch') || desc.includes('tần suất') || desc.includes('dễ dàng') || desc.includes('nhanh chóng') || desc.includes('trung bình cao')) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
        category: 'liquidity', 
        categoryName: 'Thanh khoản',
        color: 'blue',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-600'
      };
    }
    
    // 4. LOCATION ANALYSIS (Vị trí) - PURPLE
    if (desc.includes('vị trí') || desc.includes('địa điểm') || desc.includes('khu vực') || desc.includes('trung tâm') || desc.includes('quận') || desc.includes('phường') || desc.includes('đắc địa') || desc.includes('cực kỳ đắc địa') || desc.includes('thuận tiện') || desc.includes('tiếp cận') || desc.includes('gần') || desc.includes('cách')) {
      return {
        icon: <MapPin className="h-4 w-4 text-purple-600" />,
        category: 'location',
        categoryName: 'Vị trí', 
        color: 'purple', 
        bgClass: 'bg-purple-50',
        borderClass: 'border-purple-200',
        textClass: 'text-purple-600'
      };
    }
    
    // 5. INVESTMENT POTENTIAL (Tiềm năng sinh lời) - AMBER
    if (desc.includes('tiềm năng') || desc.includes('sinh lời') || desc.includes('đầu tư') || desc.includes('lợi nhuận') || desc.includes('tăng trưởng') || desc.includes('xu hướng') || desc.includes('tăng giá') || desc.includes('nhu cầu') || desc.includes('cho thuê') || desc.includes('tỷ suất') || desc.includes('ổn định')) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-amber-600" />,
        category: 'investment',
        categoryName: 'Tiềm năng sinh lời',
        color: 'amber',
        bgClass: 'bg-amber-50', 
        borderClass: 'border-amber-200',
        textClass: 'text-amber-600'
      };
    }
    
    // 6. UTILITIES & AMENITIES (Tiện ích) - CYAN
    if (desc.includes('tiện ích') || desc.includes('trường học') || desc.includes('bệnh viện') || desc.includes('chợ') || desc.includes('siêu thị') || desc.includes('công viên') || desc.includes('dịch vụ') || desc.includes('y tế') || desc.includes('giáo dục')) {
      return {
        icon: <Building className="h-4 w-4 text-cyan-600" />,
        category: 'utilities',
        categoryName: 'Tiện ích',
        color: 'cyan',
        bgClass: 'bg-cyan-50',
        borderClass: 'border-cyan-200',
        textClass: 'text-cyan-600'
      };
    }
    
    // 7. TRANSPORTATION (Giao thông) - INDIGO
    if (desc.includes('giao thông') || desc.includes('đường') || desc.includes('xe buýt') || desc.includes('metro') || desc.includes('tàu') || desc.includes('sân bay') || desc.includes('di chuyển') || desc.includes('kết nối')) {
      return {
        icon: <Car className="h-4 w-4 text-indigo-600" />,
        category: 'transportation',
        categoryName: 'Giao thông',
        color: 'indigo',
        bgClass: 'bg-indigo-50',
        borderClass: 'border-indigo-200',
        textClass: 'text-indigo-600'
      };
    }
    
    // Enhanced fallback with category-based distribution
    const fallbackOptions = [
      { icon: <Calculator className="h-4 w-4 text-emerald-600" />, category: 'valuation', categoryName: 'Định giá', color: 'emerald', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', textClass: 'text-emerald-600' },
      { icon: <Shield className="h-4 w-4 text-green-600" />, category: 'legal', categoryName: 'Pháp lý', color: 'green', bgClass: 'bg-green-50', borderClass: 'border-green-200', textClass: 'text-green-600' },
      { icon: <TrendingUp className="h-4 w-4 text-blue-600" />, category: 'liquidity', categoryName: 'Thanh khoản', color: 'blue', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-600' },
      { icon: <MapPin className="h-4 w-4 text-purple-600" />, category: 'location', categoryName: 'Vị trí', color: 'purple', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', textClass: 'text-purple-600' },
      { icon: <TrendingUp className="h-4 w-4 text-amber-600" />, category: 'investment', categoryName: 'Tiềm năng sinh lời', color: 'amber', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', textClass: 'text-amber-600' }
    ];
    
    return fallbackOptions[index % fallbackOptions.length];
  };

  return (
    <div className="space-y-6">
      {/* Mock Data Warning */}
      {isMockData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h4 className="text-amber-800 font-medium">Dữ liệu mẫu</h4>
              <p className="text-amber-700 text-sm mt-1">
                Kết quả này sử dụng dữ liệu mẫu do vấn đề kết nối API. Vui lòng thử lại sau.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Valuation Result */}
      <Card className="professional-card border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-slate-800">Kết quả định giá bất động sản</h2>
              <p className="text-sm text-slate-600 font-normal mt-1">Phân tích chi tiết bởi AI</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Price Display */}
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-2">Tổng giá trị bất động sản</p>
              <p className="text-4xl font-bold text-blue-600">
                {formatCurrency(result.totalPrice)}
              </p>
            </div>
            <div className="flex justify-center gap-6 text-sm flex-wrap">
              <div>
                <span className="text-slate-600">Giá theo m²: </span>
                <span className="font-semibold text-emerald-600">
                  {result.landArea && result.landArea > 0 && result.totalPrice ? 
                    formatCurrency(Math.round(result.totalPrice / result.landArea)) : 
                    'Chưa có thông tin'}
                </span>
              </div>
              {/* <div>
                <span className="text-slate-600">Giá nhà: </span>
                <span className="font-semibold text-orange-600">
                  {formatCurrency(result.housePrice)}
                </span>
              </div> */}
              {result.price_gov_place > 0 && !isNaN(result.price_gov_place) && (
                <div>
                  <span className="text-slate-600">Giá theo quy định: </span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(result.price_gov_place)}
                  </span>
                </div>
              )}
            </div>
          </div>



        </CardContent>
      </Card>

      {/* Gợi ý giá bán - Sử dụng AI Valuation nếu có */}
      {(() => {
        // Use AI valuation range if available, otherwise fallback to calculated range
        const aiVal = data.ai_valuation?.result?.valuation ?? data.ai_valuation?.data;

        const priceRange = (isAIEnhanced && aiVal) ? {
          minPrice: aiVal.lowValue,
          basePrice: aiVal.reasonableValue,
          maxPrice: aiVal.highValue
        } : calculatePriceRange(result.totalPrice);
        
        return (
          <Card className="professional-card bg-gradient-to-br from-blue-900 to-blue-700 text-white">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
                  <span className="text-white text-xs font-bold">💰</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Gợi ý giá bán
                  </h3>
                </div>
              </div>

                {/* Price Range Labels */}
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white"> 
                      {formatPriceRange(priceRange.minPrice)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {formatPriceRange(priceRange.maxPrice)}
                    </p>
                  </div>
                </div>

                {/* Price Range Bar */}
                <div className="relative mb-6">
                  <div className="h-3 bg-gradient-to-r from-emerald-500 to-red-500 rounded-full">
                  </div>
                  {/* Center point indicator */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-white rounded-full border-2 border-gray-400 shadow-lg"></div>
                  </div>
                  {/* Center price label */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold shadow-lg whitespace-nowrap">
                      {formatPriceRange(priceRange.basePrice)}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm">
                      Khoảng giá giúp bạn bán nhanh hơn
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm">
                      Khoảng giá giúp bạn bán với giá tốt nhất nhưng có thể sẽ chậm hơn đôi chút
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
        );
      })()}

      {/* Price Trend Chart - Thêm sau gợi ý giá bán */}
      {data.price_trend && (
        <PriceTrendChart 
          city={address.city}
          district={address.district}
          category={result.type || 'town_house'}
          data={data.price_trend?.success ? data.price_trend.data : undefined}
          className="mb-6"
          roadStats={areaPrices ? {
            avg: areaPrices['Giá trị định giá Đất trung bình'],
            low: areaPrices['Giá trị định giá Đất thấp nhất'],
            high: areaPrices['Giá trị định giá Đất cao nhất'],
          } : undefined}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="professional-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg shadow-sm">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800">Thông tin vị trí</h3>
                <p className="text-sm text-slate-600 font-normal">Chi tiết địa lý</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Thành phố:</span>
                <Badge variant="secondary">{getCityName(address?.city || '') || 'Chưa xác định'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quận/Huyện:</span>
                <Badge variant="secondary">{getDistrictName(address?.district || '') || 'Chưa xác định'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phường/Xã:</span>
                <Badge variant="outline">{address?.ward ? address.ward.replace(/_/g, ' ') : 'Chưa xác định'}</Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khoảng cách trung tâm TP:</span>
                <span className="font-semibold text-emerald-600">
                  {data.distance_analysis?.distances?.toCityCenter?.distance && 
                   !isNaN(data.distance_analysis.distances.toCityCenter.distance)
                    ? data.distance_analysis.distances.toCityCenter.distance + ' km' 
                    : 'Chưa có thông tin'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khoảng cách trung tâm quận:</span>
                <span className="font-semibold text-emerald-600">
                  {data.distance_analysis?.distances?.toDistrictCenter?.distance && 
                   !isNaN(data.distance_analysis.distances.toDistrictCenter.distance)
                    ? data.distance_analysis.distances.toDistrictCenter.distance + ' km' 
                    : 'Chưa có thông tin'}
                </span>
              </div>
              {data.distance_analysis?.analysis?.accessibility && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Đánh giá tiếp cận:</span>
                  <Badge className={`
                    ${data.distance_analysis.analysis.accessibility === 'excellent' ? 'bg-green-500 text-white' : ''}
                    ${data.distance_analysis.analysis.accessibility === 'good' ? 'bg-blue-500 text-white' : ''}
                    ${data.distance_analysis.analysis.accessibility === 'fair' ? 'bg-yellow-500 text-white' : ''}
                    ${data.distance_analysis.analysis.accessibility === 'poor' ? 'bg-red-500 text-white' : ''}
                  `}>
                    {data.distance_analysis.analysis.accessibility === 'excellent' && 'Xuất sắc'}
                    {data.distance_analysis.analysis.accessibility === 'good' && 'Tốt'}
                    {data.distance_analysis.analysis.accessibility === 'fair' && 'Trung bình'}
                    {data.distance_analysis.analysis.accessibility === 'poor' && 'Kém'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg shadow-sm">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800">Đánh giá chi tiết</h3>
                <p className="text-sm text-slate-600 font-normal">Chấm điểm tổng quan</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Điểm vị trí</span>
                  <span className="font-semibold text-blue-600">
                    {radarScore.locationScore && !isNaN(radarScore.locationScore) ? radarScore.locationScore : 0}/10
                  </span>
                </div>
                <Progress value={(radarScore.locationScore && !isNaN(radarScore.locationScore) ? radarScore.locationScore : 0) * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Điểm pháp lý</span>
                  <span className="font-semibold text-green-600">
                    {radarScore.legalityScore && !isNaN(radarScore.legalityScore) ? radarScore.legalityScore : 0}/10
                  </span>
                </div>
                <Progress value={(radarScore.legalityScore && !isNaN(radarScore.legalityScore) ? radarScore.legalityScore : 0) * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Điểm thanh khoản</span>
                  <span className="font-semibold text-orange-600">
                    {radarScore.liquidityScore && !isNaN(radarScore.liquidityScore) ? radarScore.liquidityScore : 0}/10
                  </span>
                </div>
                <Progress value={(radarScore.liquidityScore && !isNaN(radarScore.liquidityScore) ? radarScore.liquidityScore : 0) * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Tiềm năng sinh lời</span>
                  <span className="font-semibold text-purple-600">
                    {radarScore.dividendScore && !isNaN(radarScore.dividendScore) ? radarScore.dividendScore : 0}/10
                  </span>
                </div>
                <Progress value={(radarScore.dividendScore && !isNaN(radarScore.dividendScore) ? radarScore.dividendScore : 0) * 10} className="h-2" />
              </div>
              
              <Separator />
              
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Điểm tổng quan:</span>
                  <span className="text-xl font-bold text-primary">
                    {radarScore.evaluationScore && !isNaN(radarScore.evaluationScore) ? radarScore.evaluationScore : 0}/10
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phân tích từ AI */}
      {radarScore.descriptions && radarScore.descriptions.length > 0 && (
        <Card className="professional-card bg-gradient-to-br from-violet-50 via-white to-blue-50 border-violet-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg shadow-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800">Phân tích từ AI</h3>
                <p className="text-sm text-slate-600 font-normal">Đánh giá chuyên sâu từ {radarScore.descriptions.length} khía cạnh</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {radarScore.descriptions.map((desc: string, index: number) => {
                // Get icon and category info for consistent theming
                const analysisInfo = getAnalysisIconAndCategory(desc, index);
                
                return (
                  <div 
                    key={index} 
                    className={`group p-4 bg-white rounded-xl border-l-4 ${analysisInfo.borderClass} hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-default`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 ${analysisInfo.bgClass} rounded-xl shadow-sm border border-gray-100 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
                        {React.cloneElement(analysisInfo.icon, { 
                          className: analysisInfo.icon.props.className.replace('h-4 w-4', 'h-5 w-5') 
                        })}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-800 transition-colors duration-200">
                          {desc}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-1 ${analysisInfo.textClass} bg-transparent border-current opacity-60 group-hover:opacity-100 transition-opacity duration-200`}
                          >
                            {analysisInfo.categoryName}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600"
                          >
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Summary footer */}
            <div className="mt-6 p-4 bg-gradient-to-r from-violet-100 to-blue-100 rounded-lg border border-violet-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-medium text-violet-800">
                    Tổng quan phân tích AI
                  </span>
                </div>
                <Badge className="bg-violet-600 text-white shadow-sm">
                  {radarScore.descriptions.length} phân tích
                </Badge>
              </div>
              <p className="text-xs text-violet-700 mt-2">
                Dựa trên thuật toán machine learning và dữ liệu thị trường real-time
              </p>
            </div>
          </CardContent>
        </Card>
            )}

      {/* Đặc điểm bất động sản - Thông tin từ user */}
      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg shadow-sm">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-slate-800">Đặc điểm bất động sản</h3>
              <p className="text-sm text-slate-600 font-normal">Thông số kỹ thuật</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="professional-card p-4 text-center hover:shadow-md transition-all">
              <Building className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-xs text-slate-600 mb-1">Loại hình</p>
              <p className="text-lg font-semibold text-slate-800">{getPropertyType(result.type || 'lane_house')}</p>
            </div>
            <div className="professional-card p-4 text-center hover:shadow-md transition-all">
              <Ruler className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
              <p className="text-xs text-slate-600 mb-1">Diện tích đất</p>
              <p className="text-lg font-semibold text-slate-800">
                {result.landArea && result.landArea > 0 ? `${result.landArea}m²` : 'Chưa có thông tin'}
              </p>
            </div>
            <div className="professional-card p-4 text-center hover:shadow-md transition-all">
              <Home className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <p className="text-xs text-slate-600 mb-1">Diện tích nhà</p>
              <p className="text-lg font-semibold text-slate-800">
                {(result.houseArea && result.houseArea > 0) ? `${result.houseArea}m²` : 
                 (result.landArea && result.landArea > 0) ? `${result.landArea}m²` : 'Chưa có thông tin'}
              </p>
            </div>
            <div className="professional-card p-4 text-center hover:shadow-md transition-all">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="text-xs text-slate-600 mb-1">Năm xây dựng</p>
              <p className="text-lg font-semibold text-slate-800">
                {result.year || result.builtYear || 'Chưa có thông tin'}
              </p>
            </div>
            {(result.bedRoom || result.bedrooms) && (result.bedRoom > 0 || result.bedrooms > 0) && (
              <div className="professional-card p-4 text-center hover:shadow-md transition-all">
                <Bed className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-xs text-slate-600 mb-1">Phòng ngủ</p>
                <p className="text-lg font-semibold text-slate-800">{result.bedRoom || result.bedrooms}</p>
              </div>
            )}
            {(result.bathRoom || result.bathrooms) && (result.bathRoom > 0 || result.bathrooms > 0) && (
              <div className="professional-card p-4 text-center hover:shadow-md transition-all">
                <Bath className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                <p className="text-xs text-slate-600 mb-1">Phòng tắm</p>
                <p className="text-lg font-semibold text-slate-800">{result.bathRoom || result.bathrooms}</p>
              </div>
            )}
            {result.storyNumber && result.storyNumber > 0 && (
              <div className="professional-card p-4 text-center hover:shadow-md transition-all">
                <Layers className="h-6 w-6 mx-auto mb-2 text-violet-600" />
                <p className="text-xs text-slate-600 mb-1">Số tầng</p>
                <p className="text-lg font-semibold text-slate-800">{result.storyNumber}</p>
              </div>
            )}
            {result.facadeWidth && result.facadeWidth > 0 && (
              <div className="professional-card p-4 text-center hover:shadow-md transition-all">
                <Move className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <p className="text-xs text-slate-600 mb-1">Mặt tiền</p>
                <p className="text-lg font-semibold text-slate-800">{result.facadeWidth}m</p>
              </div>
            )}
            {result.laneWidth && result.laneWidth > 0 && (
              <div className="professional-card p-4 text-center hover:shadow-md transition-all">
                <Car className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-600 mb-1">Lề đường</p>
                <p className="text-lg font-semibold text-slate-800">{result.laneWidth}m</p>
              </div>
            )}
            {result.legal && (
              <div className="professional-card p-4 text-center hover:shadow-md transition-all">
                <Shield className="h-6 w-6 mx-auto mb-2 text-red-600" />
                <p className="text-xs text-slate-600 mb-1">Pháp lý</p>
                <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                  {result.legal === 'pink_book' ? 'Sổ hồng' : 
                   result.legal === 'red_book' ? 'Sổ đỏ' : 
                   result.legal === 'white_book' ? 'Sổ trắng' : 
                   result.legal === 'contract' ? 'Hợp đồng' : result.legal}
                </Badge>
              </div>
            )}
          </div>

          {/* Bảng giá đất Nhà nước */}
          {data.price_gov_data && (() => {
            let pg: any = null;
            try {
              pg = typeof data.price_gov_data === 'string' ? JSON.parse(data.price_gov_data) : data.price_gov_data;
            } catch (e) {
              pg = null;
            }
            if (!pg) return null;

            const vtKeys = ['VT1', 'VT2', 'VT3', 'VT4'].filter(k => pg[k]);

            const vtDescriptions: Record<string, string> = {
              VT1: 'Thửa đất của một chủ sử dụng có ít nhất một mặt giáp đường/phố có tên trong bảng giá. Vị trí thuận lợi nhất.',
              VT2: 'Thửa đất có ít nhất một mặt giáp ngõ/hẻm, mặt cắt ngõ ≥ 4,5m.',
              VT3: 'Thửa đất giáp ngõ có mặt cắt từ 3m đến dưới 4,5m.',
              VT4: 'Thửa đất giáp ngõ có mặt cắt dưới 3m. Vị trí kém thuận lợi nhất.'
            };
            if (vtKeys.length === 0) return null;

            const formatGovPrice = (value: string | number) => {
              // Chuyển chuỗi "173.420.000" => 173420000
              const cleaned = value.toString().replace(/[^0-9]/g, '');
              const num = parseInt(cleaned, 10);
              if (isNaN(num) || num <= 0) return 'N/A';
              // Đổi sang đơn vị triệu VND/m²
              return `${(num / 1_000_000).toFixed(1)} triệu/m²`;
            };

            return (
              <div className="mt-6">
                <Separator className="my-4" />
                <div className="space-y-3">
                  {(() => {
                    const headerParts: string[] = [];
                    if (pg['Đường']) headerParts.push(pg['Đường']);
                    if (pg['Quận']) headerParts.push(pg['Quận']);
                    const headerLocation = headerParts.join(', ');
                    return (
                      <h4 className="text-slate-800 font-medium flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        Bảng giá đất Nhà nước {headerLocation && `(${headerLocation})`}
                      </h4>
                    );
                  })()}
                  <TooltipProvider>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {vtKeys.map(key => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <div className="professional-card p-4 text-center cursor-help">
                              <p className="text-xs text-slate-600 mb-1">{key}</p>
                              <p className="text-lg font-semibold text-slate-800">{formatGovPrice(pg[key])}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-center">
                            {vtDescriptions[key] || ''}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                  {(() => {
                    const lineParts: string[] = [];
                    // if (pg['Đường']) lineParts.push(pg['Đường']);
                    // if (pg['Quận']) lineParts.push(pg['Quận']);
                    // const firstLine = lineParts.join(', ');
                    const segment = pg['Đoạn (từ–đến)'] || pg['Đoạn (từ-den)'] || '';
                    return (
                      <p className="text-xs text-gray-500 mt-2 text-center whitespace-pre-line">
                        {/* {firstLine} */}
                        {segment && (<><br/>Đoạn: {segment}</>)}
                      </p>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

        </CardContent>
      </Card>

      {/* Removed Valuation Summary & Area Prices Cards (moved and integrated elsewhere) */}

      {/* Bản đồ tiện ích xung quanh - Phần cuối */}
      {(() => {
        // Tìm coordinates từ nhiều nguồn với thứ tự ưu tiên mới
        let lat, lng;
        
        // Debug log để kiểm tra data - Enhanced
        console.log('🗺️ Debug utilities map data (ENHANCED):', {
          input_data_coordinates: data.input_data?.coordinates,
          valuation_payload_geoLocation: data.valuation_payload?.geoLocation,
          result_geoLocation: result.geoLocation,
          evaluation_geoLocation: data.valuation_result?.evaluation?.geoLocation,
          utilities_exists: data.utilities ? 'YES' : 'NO',
          utilities_structure: data.utilities ? Object.keys(data.utilities) : 'N/A',
          utilities_data_exists: data.utilities?.data ? 'YES' : 'NO',
          utilities_data_length: data.utilities?.data?.length,
          utilities_total: data.utilities?.total,
          utilities_success: data.utilities?.success,
          utilities_groupedData_exists: data.utilities?.groupedData ? 'YES' : 'NO',
          utilities_full_object: data.utilities
        });
        
        // Thứ tự ưu tiên tìm coordinates:
        // 1. input_data.coordinates (từ user input) - format [lat, lng]
        // 2. valuation_payload.geoLocation (từ API) - format [lng, lat] 
        // 3. result.geoLocation (computed)
        // 4. evaluation.geoLocation (fallback)
        
        if (data.input_data?.coordinates && Array.isArray(data.input_data.coordinates) && data.input_data.coordinates.length === 2) {
          // Input coordinates luôn là [lat, lng]
          lat = data.input_data.coordinates[0];
          lng = data.input_data.coordinates[1];
          console.log('📍 Using input_data coordinates:', { lat, lng });
        } else if (data.valuation_payload?.geoLocation && Array.isArray(data.valuation_payload.geoLocation) && data.valuation_payload.geoLocation.length === 2) {
          // API payload coordinates là [lng, lat] - cần đảo ngược
          lng = data.valuation_payload.geoLocation[0];
          lat = data.valuation_payload.geoLocation[1];
          console.log('📍 Using valuation_payload coordinates:', { lat, lng });
        } else if (result.geoLocation && Array.isArray(result.geoLocation) && result.geoLocation.length === 2) {
          // Result coordinates thường là [lng, lat] 
          lng = result.geoLocation[0];
          lat = result.geoLocation[1];
          console.log('📍 Using result coordinates:', { lat, lng });
        } else if (data.valuation_result?.evaluation?.geoLocation && Array.isArray(data.valuation_result.evaluation.geoLocation) && data.valuation_result.evaluation.geoLocation.length === 2) {
          // Evaluation coordinates là [lng, lat]
          lng = data.valuation_result.evaluation.geoLocation[0];
          lat = data.valuation_result.evaluation.geoLocation[1];
          console.log('📍 Using evaluation coordinates:', { lat, lng });
        }
        
        // Validation coordinates - đảm bảo là số hợp lệ
        if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          // Fallback coordinates cho Hà Nội
          lat = 21.0282993;
          lng = 105.8539963;
          console.log('⚠️ Using fallback Hanoi coordinates:', { lat, lng });
        }
        
        console.log('✅ Final coordinates for utilities map:', { lat, lng });
        
        // Hiển thị utilities map luôn
        return (
          <UtilitiesInteractiveMap 
            latitude={lat} 
            longitude={lng}
            distance={5}
            size={5}
            utilities={data.utilities}
          />
        );
      })()}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex flex-wrap justify-between items-center text-sm text-gray-600">
            <span>Transaction ID: {`TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`}</span>
            <span>Ngày tạo: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}