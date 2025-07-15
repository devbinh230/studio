'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Bath, LayoutPanelLeft, TrendingUp, MapPin, Sparkles, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CombinedResult, RealEstate } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface ComparableSalesProps {
  result?: CombinedResult;
}

interface AIRealEstateData {
  "giá trung bình": string | number;
  "các tin rao bán": Array<{
    "tiêu đề": string;
    "giá": string | number;
    "diện tích": string | number;
    "địa chỉ": string;
    "link": string;
  }>;
}

interface TransformedProperty {
  id: string;
  title: string;
  address: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  image: string;
  district: string;
  status: { label: string; className: string };
  pricePerM2: number;
  type: string;
  link?: string; // Optional link for AI data
}

const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)} T ₫`;
    } else if (value >= 1000000) {
        return `${Math.round(value / 1000000)} Tr ₫`;
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
};

// Add parsing functions for Vietnamese format
const parseVietnameseCurrency = (price: string | number): number => {
  // If the input is already a number, return it directly
  if (typeof price === 'number') return price;
  
  if (!price || typeof price !== 'string') return 0;
  
  // Remove citation marks like [6] and clean up
  const cleaned = price.replace(/\[\d+\]/g, '').trim();
  
  // Handle different formats
  if (cleaned.includes('tỷ')) {
    const number = parseFloat(cleaned.replace(/[^\d.,]/g, '').replace(',', '.'));
    return number * 1000000000; // Convert billion VND to VND
  } else if (cleaned.includes('triệu') || cleaned.includes('tr')) {
    const number = parseFloat(cleaned.replace(/[^\d.,]/g, '').replace(',', '.'));
    return number * 1000000; // Convert million VND to VND
  } else {
    // Try to parse as raw number
    const number = parseFloat(cleaned.replace(/[^\d]/g, ''));
    return isNaN(number) ? 0 : number;
  }
};

const parseVietnameseArea = (area: string | number): number => {
  // If the input is already a number, return it directly
  if (typeof area === 'number') return area;
  
  if (!area || typeof area !== 'string') return 0;
  
  // Remove citation marks like [6] and clean up
  const cleaned = area.replace(/\[\d+\]/g, '').trim();
  
  // Extract number before m2 or m²
  const match = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  
  return 0;
};

const parseVietnameseNumber = (numStr: string | number): number => {
  if (typeof numStr === 'number') return numStr;
  if (!numStr || typeof numStr !== 'string') return 0;
  
  // Remove citation marks like [6] and clean up
  const cleaned = numStr.replace(/\[\d+\]/g, '').trim();
  const number = parseFloat(cleaned.replace(/[^\d]/g, ''));
  return isNaN(number) ? 0 : number;
};

const getStatusBadge = (pricePerM2: number) => {
  if (pricePerM2 >= 150000000) {
    return { label: 'Cao cấp', className: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' };
  } else if (pricePerM2 >= 100000000) {
    return { label: 'Hot', className: 'bg-gradient-to-r from-red-500 to-red-600 text-white' };
  } else if (pricePerM2 >= 50000000) {
    return { label: 'Tốt', className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' };
  } else {
    return { label: 'Hợp lý', className: 'bg-gradient-to-r from-green-500 to-green-600 text-white' };
  }
};

// Trả về nhãn hiển thị cho badge địa chỉ: ưu tiên Đường + Phường
const getDistrictName = (addressDetail: string) => {
  if (!addressDetail) return 'Không xác định';

  // Chuẩn hoá và tách theo dấu phẩy (,) – định dạng phổ biến
  let parts = addressDetail.split(',').map((p) => p.trim()).filter(Boolean);

  // Nếu không có dấu phẩy thì thử với dấu gạch ngang ( - )
  if (parts.length <= 1) {
    parts = addressDetail.split(' - ').map((p) => p.trim()).filter(Boolean);
  }

  if (parts.length >= 2) {
    const street = parts[0].replace(/^Đường\s+/i, '');
    const ward = parts[1].replace(/^Phường\s+/i, '').replace(/^Xã\s+/i, '');
    return `${street}, ${ward}`;
  }

  // Fallback: trả về phần đầu tiên hoặc 'Không xác định'
  return parts[0] || 'Không xác định';
};

const generateBedsBaths = (area: number) => {
  // Estimate beds and baths based on area
  if (area >= 120) return { beds: 3, baths: 3 };
  if (area >= 80) return { beds: 3, baths: 2 };
  if (area >= 50) return { beds: 2, baths: 2 };
  return { beds: 2, baths: 1 };
};

export function ComparableSales({ result }: ComparableSalesProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Try to get AI real estate data first, then fallback to API data
  const aiRealEstateData = (result as any)?.ai_real_estate_data as AIRealEstateData | null;
  
  // Debug logging to see what data we receive
  console.log('🏠 ComparableSales Debug:', {
    result_exists: !!result,
    ai_real_estate_data_exists: !!aiRealEstateData,
    ai_real_estate_data_structure: aiRealEstateData ? Object.keys(aiRealEstateData) : 'N/A',
    ai_real_estate_data: aiRealEstateData,
    full_result: result
  });
  
  const realEstates = result && 'valuation_result' in result && result.valuation_result?.realEstates
    ? result.valuation_result.realEstates.slice(0, 3)
    : [];

  // Demo images for properties (to avoid hostname configuration issues)
  const demoImages = [
    'https://masteriwaterfrontoceanpark.com/wp-content/uploads/2023/08/phong-khach-can-ho-master-waterfront.jpg',
    'https://masterihomes.com.vn/wp-content/uploads/2021/05/can-ho-mau-masteri-centre-point-18.jpg',
    'https://masterisevietnam.com/wp-content/uploads/2021/06/phong-bep-1-ngu-masteri-west-heights.jpg'
  ];

  // Transform AI real estate data to component format
  const aiComparableProperties: TransformedProperty[] = aiRealEstateData?.["các tin rao bán"] 
    ? aiRealEstateData["các tin rao bán"].map((listing, index) => {
        // Parse Vietnamese formatted data
        const parsedPrice = parseVietnameseCurrency(listing["giá"]);
        const parsedArea = parseVietnameseArea(listing["diện tích"]);
        const pricePerM2 = parsedArea > 0 ? parsedPrice / parsedArea : 0;
        const { beds, baths } = generateBedsBaths(parsedArea);
        
        console.log('🏠 Processing AI listing:', {
          index,
          original_price: listing["giá"],
          parsed_price: parsedPrice,
          original_area: listing["diện tích"],
          parsed_area: parsedArea,
          price_per_m2: pricePerM2,
          title: listing["tiêu đề"],
          address: listing["địa chỉ"],
          link: listing["link"]
        });
        
        return {
          id: `ai-${index}`,
          title: listing["tiêu đề"],
          address: listing["địa chỉ"],
          price: parsedPrice,
          area: parsedArea,
          beds,
          baths,
          image: demoImages[index] || demoImages[0],
          district: getDistrictName(listing["địa chỉ"]),
          status: getStatusBadge(pricePerM2),
          pricePerM2,
          type: 'ai-listing',
          link: listing["link"] ? listing["link"].replace(/\\+$/, '') : undefined // Clean up trailing backslashes
        };
      })
    : [];

  // Transform API data to component format
  const apiComparableProperties: TransformedProperty[] = realEstates.map((estate: RealEstate, index: number) => {
    const pricePerM2 = estate.area > 0 ? estate.totalPrice / estate.area : 0;
    const { beds, baths } = generateBedsBaths(estate.area);
    
    return {
      id: estate.id,
      title: estate.title,
      address: estate.address.detail || 'Địa chỉ không xác định',
      price: estate.totalPrice || estate.price * estate.area,
      area: estate.area,
      beds,
      baths,
      image: demoImages[index] || demoImages[0], // Use demo images instead of API images
      district: getDistrictName(estate.address.detail || ''),
      status: getStatusBadge(pricePerM2),
      pricePerM2,
      type: estate.type
    };
  });

  // Use AI data if available, otherwise use API data
  const comparableProperties = aiComparableProperties.length > 0 ? aiComparableProperties : apiComparableProperties;
  
  // Handle both old and new format for average price
  const averagePrice = aiRealEstateData ? 
    (typeof aiRealEstateData["giá trung bình"] === 'number' ? 
      aiRealEstateData["giá trung bình"] : 
      parseVietnameseNumber(aiRealEstateData["giá trung bình"]) || 0) : 0;

  console.log('🏠 Final comparable properties:', {
    ai_properties_count: aiComparableProperties.length,
    api_properties_count: apiComparableProperties.length,
    using_ai_data: aiComparableProperties.length > 0,
    average_price: averagePrice,
    comparable_properties: comparableProperties
  });

  // Show placeholder message if no data
  if (!result || comparableProperties.length === 0) {
    return (
      <Card className="professional-card bg-gradient-to-br from-orange-50 via-white to-yellow-50 border-orange-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">BĐS tương tự</h3>
                <Sparkles className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-sm text-slate-600 font-normal">Thị trường gần đây</p>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center py-8">
          <Home className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Chưa có dữ liệu so sánh</p>
          <p className="text-sm text-slate-500 mt-1">Vui lòng thực hiện định giá để xem thông tin</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="professional-card bg-gradient-to-br from-orange-50 via-white to-yellow-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">BĐS tương đương</h3>
              <Sparkles className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-sm text-slate-600 font-normal">
              {aiComparableProperties.length > 0 ? 'Dữ liệu AI Search' : 'Thị trường gần đây'}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {comparableProperties.map((prop: TransformedProperty) => {
          const CardWrapper = prop.link ? 'a' : 'div';
          const cardProps = prop.link ? {
            href: prop.link,
            target: '_blank',
            rel: 'noopener noreferrer',
            title: 'Click để xem chi tiết tại nguồn',
            className: 'group block p-4 bg-white/80 rounded-xl border border-orange-100 hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:border-orange-300 no-underline hover:shadow-orange-100'
          } : {
            className: 'group p-4 bg-white/80 rounded-xl border border-orange-100 hover:bg-white hover:shadow-md transition-all duration-300 hover:scale-[1.02]'
          };

          return (
            <article key={prop.id}>
              <CardWrapper {...cardProps}>
                <div className="flex gap-4">
                  <div className="relative">
                    <Image
                      src={prop.image}
                      alt={`Hình ảnh của ${prop.title}`}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover aspect-square shadow-sm"
                    />
                    <Badge className={`absolute -top-2 -right-2 text-xs ${prop.status.className}`}>
                      {prop.status.label}
                    </Badge>
                    {prop.link && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-full h-full bg-orange-400 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    {/* Price and District */}
                    <div className="flex items-center justify-between">
                      <p className={`text-lg font-bold transition-colors duration-300 ${prop.link ? 'text-orange-700 group-hover:text-orange-800' : 'text-orange-700'}`}>
                        {isMounted ? formatCurrency(prop.price) : '...'}
                      </p>
                      <Badge variant="outline" className={`bg-orange-50 text-orange-700 border-orange-200 transition-colors duration-300 ${prop.link ? 'group-hover:bg-orange-100 group-hover:border-orange-300' : ''}`}>
                        <MapPin className="h-3 w-3 mr-1" />
                        {prop.district}
                      </Badge>
                    </div>
                    
                    {/* Title */}
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight line-clamp-2 flex-1 transition-colors duration-300 ${prop.link ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-700'}`}>
                        {prop.title}
                      </p>
                      {prop.link && (
                        <div className="text-orange-600 group-hover:text-orange-800 transition-all duration-300 flex-shrink-0 group-hover:scale-110">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    
                    {/* Address with link styling */}
                    <div className="flex items-center gap-2">
                      <p className={`text-xs leading-tight line-clamp-1 flex-1 transition-colors duration-300 ${prop.link ? 'text-orange-600 font-medium group-hover:text-orange-800' : 'text-slate-500'}`}>
                        {prop.address}
                      </p>
                      {prop.link && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs group-hover:bg-orange-100 group-hover:border-orange-300 transition-colors duration-300">
                          <ExternalLink className="h-3 w-3 mr-1 group-hover:rotate-12 transition-transform duration-300" />
                          Xem
                        </Badge>
                      )}
                    </div>
                
                {/* Property Details */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                    <BedDouble className="h-3 w-3" /> {prop.beds}
                  </Badge>
                  <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 border-cyan-200 flex items-center gap-1">
                    <Bath className="h-3 w-3" /> {prop.baths}
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <LayoutPanelLeft className="h-3 w-3" /> {prop.area} m²
                  </Badge>
                </div>
                
                {/* Price per m2 */}
                <div className="pt-2 border-t border-orange-100">
                  <p className="text-xs text-slate-500">
                    Giá/m²: <span className="font-semibold text-orange-600">{isMounted ? formatCurrency(prop.pricePerM2) : '...'}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardWrapper>
        </article>
      );
    })}
        
        {/* Summary Section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 mb-2">Giá trung bình/m² khu vực</p>
            <p className="text-xl font-bold text-orange-700">
              {isMounted && (() => {
                // Calculate average price per m² consistently
                if (comparableProperties.length > 0) {
                  // Always calculate from comparable properties for accuracy
                  const avgPricePerM2 = comparableProperties.reduce((sum: number, prop: TransformedProperty) => sum + prop.pricePerM2, 0) / comparableProperties.length;
                  return formatCurrency(avgPricePerM2);
                } else {
                  return 'Chưa có dữ liệu';
                }
              })()}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {aiComparableProperties.length > 0 ? 
                `Từ ${aiComparableProperties.length} tin rao bán (AI Search)` :
                `Từ ${comparableProperties.length} BDS tương đương trong khu vực`
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

