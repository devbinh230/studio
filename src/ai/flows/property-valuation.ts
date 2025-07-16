'use server';

/**
 * @fileOverview Estimates a property's value range (low, reasonable, high) based on its details and market data.
 *
 * - propertyValuationRange - A function that handles the property valuation process.
 * - PropertyValuationRangeInput - The input type for the propertyValuationRange function.
 * - PropertyValuationRangeOutput - The return type for the propertyValuationRange function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// import { number } from 'zod';

const PropertyValuationRangeInputSchema = z.object({
  address: z.string().describe('Địa chỉ chi tiết của bất động sản (có thể để trống nếu đã cung cấp city/district/ward).').optional(),
  city: z.string().describe('Thành phố/Tỉnh.'),
  district: z.string().describe('Quận/Huyện.'),
  ward: z.string().describe('Phường/Xã.'),
  administrativeLevel: z.number().describe('Cấp hành chính.'),
  type: z.string().describe('Loại bất động sản (ví dụ: lane_house, NORMAL, v.v.).'),
  size: z.number().describe('Diện tích sàn (m²).'),
  lotSize: z.number().describe('Diện tích lô đất (m²).'),
  landArea: z.number().describe('Diện tích đất (m²).'),
  houseArea: z.number().describe('Diện tích sàn xây dựng (m²).'),
  laneWidth: z.number().describe('Chiều rộng hẻm/đường vào (m).'),
  facadeWidth: z.number().describe('Chiều rộng mặt tiền (m).'),
  facadeCount: z.number().describe('Số lượng mặt tiền (m), ví dụ 1,2,3.').optional(),
  storyNumber: z.number().describe('Số tầng.').optional(),
  bedrooms: z.number().describe('Số phòng ngủ.').optional(),
  bathrooms: z.number().describe('Số phòng tắm.').optional(),
  amenities: z.array(z.string()).describe('Danh sách tiện ích xung quanh (trường học, bệnh viện, trung tâm thương mại, công viên, giao thông công cộng, v.v.).').optional(),
  yearBuilt: z.number().describe('Năm xây dựng bất động sản.'),
  marketData: z.string().describe('Dữ liệu thị trường hiện tại cho các bất động sản tương đương trong khu vực.'),
  searchData: z.string().describe('Dữ liệu search được từ internet về bất động sản trong khu vực.').optional(),
  price_gov: z.string().describe('Dữ liệu giá bất động sản nhà nước').optional(),
  house_direction: z.string().describe('Hướng nhà').optional(),
  legal: z.string().describe('Loại hợp đồng (contract, white_book, pink_book, red_book).').optional(),
  alleyType: z.string().describe('Loại ngõ (thong: ngõ thông, cut: ngõ cụt).').optional(),
  houseDirection: z.string().describe('Hướng nhà (dong, tay, nam, bac).').optional(),
  soShape: z.string().describe('Hình dạng lô đất').optional(),
});
export type PropertyValuationRangeInput = z.infer<typeof PropertyValuationRangeInputSchema>;

// Thêm giá nhà nước (price_gov_place) và ai_real_estate_data vào schema output
const PropertyValuationRangeOutputSchema = z.object({
  lowValue: z.number().describe('Giá thấp nhất có thể cho bất động sản.'),
  reasonableValue: z.number().describe('Giá hợp lý nhất cho bất động sản.'),
  highValue: z.number().describe('Giá cao nhất có thể đạt được cho bất động sản.'),
  price_house: z.number().describe('Giá nhà tham khảo.'),
  price_gov_place: z.number().describe('Giá theo quy định nhà nước cho vị trí lô đất.'),
  ai_real_estate_data: z.any().describe('Dữ liệu AI về bất động sản từ search data.').optional(),
});
export type PropertyValuationRangeOutput = z.infer<typeof PropertyValuationRangeOutputSchema>;

// Helper function to calculate coefficients (from price.py)
function calculateCoefficients(input: PropertyValuationRangeInput) {
  // Lane coefficient
  const laneWidth = input.laneWidth || 0;
  let laneCoef = 0.0;
  if (laneWidth >= 5) {
    laneCoef = 0.04; // car_avoid
  } else if (laneWidth >= 3) {
    laneCoef = 0.01; // car_lane
  } else if (laneWidth > 0) { //  xe máy tránh
    laneCoef = -0.03; // small_lane
  }

  // Alley type coefficient
  let alleyCoef = 0.0;
  if (input.alleyType === 'thong') {
    alleyCoef = 0.03; // Ngõ thông có giá cao hơn
  } else if (input.alleyType === 'cut') {
    alleyCoef = -0.02; // Ngõ cụt có giá thấp hơn
  }

  // House direction coefficient
  let directionCoef = 0.0;
  switch (input.houseDirection) {
    case 'nam':
      directionCoef = 0.03; // Hướng Nam tốt nhất
      break;
    case 'dong':
      directionCoef = 0.01; // Hướng Đông tốt
      break;
    case 'bac':
      directionCoef = -0.02; // Hướng Tây kém hơn
      break;
    case 'tay':
      directionCoef = -0.05; // Hướng Bắc kém nhất
      break;
    default:
      directionCoef = 0.0;
  }

  // Hình dạng lô đất 
  let bookCoef = 0.0;
  switch (input.soShape) {
    case 'vuong':
      bookCoef = 0.0; // sổ vuông chuẩn
      break;
    case 'no_hau':
      bookCoef = 0.04; // no hau
      break;
    case 'thop_hau':
      bookCoef = -0.03; // thop hau
      break;
    case 'phuc_tap':
      bookCoef = -0.07; // 
      break;
    default:
      bookCoef = 0.0;
  }

  // Legal coefficient (mapping theo legal type)
  let legalCoef = 0.0;
  switch (input.legal) {
    case 'contract':
      legalCoef = -0.2;
      break;
    case 'white_book':
      legalCoef = -0.3;
      break;
    case 'pink_book':
    case 'red_book':
      legalCoef = 0.0;
      break;
    default:
      legalCoef = 0.0;
  }

const facadeWidth  = input.facadeWidth  || 0;  // mét
const facadeCount  = input.facadeCount  || 1;  // 1, 2, 3…

// 1) Hệ số theo CHIỀU RỘNG mặt tiền
let widthCoef = 0.0;
if (facadeWidth >= 8) {          // mặt tiền ≥ 10 m
  widthCoef = 0.07;                 // premium 10 %
} else if (facadeWidth >= 5) {    // 6 – <10 m
  widthCoef = 0.04;                 // premium 5 %
} else if (facadeWidth >= 3.5) {    // 4 – <6 m
  widthCoef = 0.0;                 // premium 2 %
} else if (facadeWidth > 0) {     // <4 m
  widthCoef = -0.03;                // chiết khấu 3 %
}

// 2) Hệ số theo SỐ MẶT TIỀN (góc, 3 mặt thoáng…)
let cornerCoef = 0.0;
switch (facadeCount) {
  case 2:  // lô góc hai mặt tiền
    cornerCoef = 0.07;  // +8 %
    break;
  case 3:  // ba mặt tiền
    cornerCoef = 0.1;  // +12 %
    break;
  default: // 1 mặt tiền hoặc >3 mặt tiền tùy chỉnh
    cornerCoef = 0.0;
}


  return { laneCoef, legalCoef, widthCoef, cornerCoef, alleyCoef, directionCoef, bookCoef };
}

// Helper function to calculate construction price (from price.py)
function calculateConstructionPrice(input: PropertyValuationRangeInput) {
  const size = input.size || 0;
  const storyNumber = input.storyNumber || 0;
  const yearBuilt = input.yearBuilt || 0;
  const bedrooms = input.bedrooms || 0;
  const bathrooms = input.bathrooms || 0;

  // Total floor area
  const totalFloorArea = size * storyNumber;

  // Unit price based on story number
  let unitPrice = 4_500_000; // 1 story
  if (storyNumber >= 4) {
    unitPrice = 7_500_000;
  } else if (storyNumber >= 2) {
    unitPrice = 5_500_000;
  }

  // Wear coefficient based on house age
  const currentYear = new Date().getFullYear();
  const houseAge = currentYear - (yearBuilt || currentYear);
  let wearCoef = 1.0;
  if (houseAge < 3) {
    wearCoef = 0.07;
  } else if (houseAge < 5) {
    wearCoef = 0.05;
  } else if (houseAge < 10) {
    wearCoef = 0.02;
  } else if (houseAge < 20) {
    wearCoef = -0.10;
  }

  // Room coefficient
  let roomCoef = 0.0;
  if (bedrooms < 2) {
    roomCoef = -0.03;
  } else if (bedrooms > 4) {
    roomCoef = 0.02;
  }
  // Toilet coefficient
  let toiletCoef = 0.0;
  if (bathrooms && storyNumber && bathrooms >= storyNumber) {
    toiletCoef = 0.02;
  } else if (bathrooms && storyNumber && bathrooms < storyNumber) {
    toiletCoef = -0.02;
  }
  // Construction price
  const priceHouse = totalFloorArea * unitPrice * (1 + wearCoef + roomCoef + toiletCoef);
  return priceHouse;
}

// Helper function to extract market price from searchData first, then marketData
function extractMarketPrice(marketData: string, searchData?: string, lotSize?: number): number {
  // Helper to recursively search for average price value in any JSON object
  const findAvgPrice = (obj: any): number | null => {
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const key = k.toLowerCase();
        if (typeof v === 'number' && /gia_trung_binh|giá|price/.test(key) && /(trung_binh|trung bình|average)/.test(key)) {
          return v; // already numeric (assumed VND/m2)
        }
        if (typeof v === 'string') {
          const numMatch = v.match(/([\d\.]+)(?=\s*(triệu|ty|tỷ|tr|vnđ|vnd)?)/i);
          if (numMatch) {
            let price = parseFloat(numMatch[1]);
            // Kiểm tra đơn vị và chuyển đổi về VND/m2
            if (v.includes('triệu')) {
              price = price * 1_000_000;
            } else if (v.includes('tỷ') || v.includes('ty')) {
              price = price * 1_000_000_000;
            }
            return price;
          }
        }
        if (typeof v === 'object') {
          const nested = findAvgPrice(v);
          if (nested) return nested;
        }
      }
    }
    return null;
  };

  // First try to extract from searchData
  if (searchData) {
    // 1) Look for fenced code block with json language
    const fenceRegexes = [
      /```json[\s\S]*?```/i,
      /```[\s\S]*?```/ // generic
    ];
    for (const reg of fenceRegexes) {
      const fenceMatch = searchData.match(reg);
      if (fenceMatch) {
        const jsonText = fenceMatch[0].replace(/```json/i, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(jsonText);
          const avg = findAvgPrice(parsed);
          if (avg && !isNaN(avg)) {
            return avg;
          }
        } catch {
          // ignore parse error, continue
        }
      }
    }

    // 2) Try parsing direct JSON object - prioritize new format
    try {
      const parsed = JSON.parse(searchData);
      if (parsed && typeof parsed === 'object') {
        // Check for new format with underscores (prioritized)
        if (parsed["gia_trung_binh"]) {
          const avgPrice = typeof parsed["gia_trung_binh"] === 'number' 
            ? parsed["gia_trung_binh"] 
            : parseFloat(parsed["gia_trung_binh"]);
          if (!isNaN(avgPrice)) {
            return avgPrice;
          }
        }
        
        // Fallback to old format with spaces
        if (parsed["giá trung bình"]) {
          const avgPrice = typeof parsed["giá trung bình"] === 'number' 
            ? parsed["giá trung bình"] 
            : parseFloat(parsed["giá trung bình"]);
          if (!isNaN(avgPrice)) {
            return avgPrice;
          }
        }
        
        const avg = findAvgPrice(parsed);
        if (avg && !isNaN(avg)) {
          return avg;
        }
      }
    } catch {
      // Not valid JSON, continue with other methods
    }

    // 3) Regex scan for price patterns in plain text
    const searchPricePatterns = [
      /Giá trung bình[:\s]*([\d\.]+)\s*triệu\s*(?:VND|VNĐ)?\/?m²?/i,
      /average price[:\s]*([\d\.]+)\s*vnd\s*\/\s*m2/i,
      /giá[:\s]*([\d\.]+)\s*triệu/i,
      /([\d\.]+)\s*triệu.*m²?/i,
    ];
    for (const pattern of searchPricePatterns) {
      const match = searchData.match(pattern);
      if (match) {
        return parseFloat(match[1]) * 1_000_000; // Convert to VND/m²
      }
    }
  }
  
  // Fall back to marketData if no price found in searchData
  const patterns = [
    /Giá trung bình[:\s]*([\d\.]+)\s*triệu\s*VND\/m²/i,
    /(\d+\.?\d*)\s*triệu\s*VND\/m²/i,
    /(\d+\.?\d*)\s*triệu/i
  ];
  
  for (const pattern of patterns) {
    const match = marketData.match(pattern);
    if (match) {
      return parseFloat(match[1]) * 1_000_000; // Convert to VND/m²
    }
  }
  
  // Fallback: extract any number that looks like a price per m2
  const fallbackMatch = marketData.match(/(\d+\.?\d*)/);
  if (fallbackMatch) {
    const price = parseFloat(fallbackMatch[1]);
    // If it's a small number, assume it's in millions
    if (price < 1000) {
      return price * 1_000_000;
    }
    return price;
  }
  
  console.log("Could not extract market price, using fallback");
  return 50_000_000; // 50 million VND/m² as fallback
}

// Helper function to extract AI real estate data from searchData
function extractAIRealEstateData(searchData?: string): any {
  if (!searchData) return null;

  // 1) Try parsing direct JSON object - prioritize new format
  try {
    const parsed = JSON.parse(searchData);
    if (parsed && typeof parsed === 'object') {
      // Check for new format with underscores (prioritized - keep original format)
      if (parsed["cac_tin_rao_ban"]) {
        return parsed; // Return as-is with new format
      }
      // Fallback to old format with spaces
      if (parsed["các tin rao bán"]) {
        return parsed;
      }
    }
  } catch {
    // Not valid JSON, continue with other methods
  }

  // 2) Look for fenced code block with json language
  const fenceRegexes = [
    /```json[\s\S]*?```/i,
    /```[\s\S]*?```/ // generic
  ];
  for (const reg of fenceRegexes) {
    const fenceMatch = searchData.match(reg);
    if (fenceMatch) {
      // Remove the backticks and optional language tag
      const jsonText = fenceMatch[0].replace(/```json/i, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed && typeof parsed === 'object') {
          // Check for new format with underscores (prioritized - keep original format)
          if (parsed["cac_tin_rao_ban"]) {
            return parsed; // Return as-is with new format
          }
          // Fallback to old format with spaces
          if (parsed["các tin rao bán"]) {
            return parsed;
          }
        }
      } catch {
        // ignore parse error, continue
      }
    }
  }

  // 3) Try old brace matching method for both formats
  try {
    // Try new format first
    let jsonMatch = searchData.match(/\{[\s\S]*"cac_tin_rao_ban"[\s\S]*\}/i);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);
      if (jsonData && typeof jsonData === 'object' && jsonData["cac_tin_rao_ban"]) {
        return jsonData; // Return as-is with new format
      }
    }
    
    // Try old format
    jsonMatch = searchData.match(/\{[\s\S]*"các tin rao bán"[\s\S]*\}/i);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);
      if (jsonData && typeof jsonData === 'object' && jsonData["các tin rao bán"]) {
        return jsonData;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

// Generate pricing formula and coefficients as text for AI to understand
function generatePricingFormula(input: PropertyValuationRangeInput): {
  formula: string;
  coefficientsBreakdown: string;
  baseMarketPrice: number;
} {
  const baseMarketPrice = extractMarketPrice(input.marketData, input.searchData, input.lotSize);
  const lotSize = input.lotSize || 0;
  
  const { laneCoef, legalCoef, widthCoef, cornerCoef, alleyCoef, directionCoef, bookCoef } = calculateCoefficients(input);
  
  // Total coefficient
  const totalCoef = 1 + laneCoef + legalCoef + widthCoef + cornerCoef + alleyCoef + directionCoef + bookCoef;
  
  // Create detailed breakdown
  const coefficientsBreakdown = `
CÔNG THỨC TÍNH GIÁ: Giá nhà trung bình (${baseMarketPrice.toLocaleString()} VND/m²) × Diện tích đất (${lotSize} m²) × Hệ số tổng (${totalCoef.toFixed(4)})

CHI TIẾT HỆ SỐ:
- Hệ số cơ bản: 1.0000
- Hệ số chiều rộng ngõ (${input.laneWidth || 0}m): ${laneCoef >= 0 ? '+' : ''}${laneCoef.toFixed(4)}
- Hệ số loại ngõ (${input.alleyType || 'không xác định'}): ${alleyCoef >= 0 ? '+' : ''}${alleyCoef.toFixed(4)}
- Hệ số hướng nhà (${input.houseDirection || 'không xác định'}): ${directionCoef >= 0 ? '+' : ''}${directionCoef.toFixed(4)}
- Hệ số hình dạng lô (${input.soShape || 'không xác định'}): ${bookCoef >= 0 ? '+' : ''}${bookCoef.toFixed(4)}
- Hệ số pháp lý (${input.legal || 'không xác định'}): ${legalCoef >= 0 ? '+' : ''}${legalCoef.toFixed(4)}
- Hệ số chiều rộng mặt tiền (${input.facadeWidth || 0}m): ${widthCoef >= 0 ? '+' : ''}${widthCoef.toFixed(4)}
- Hệ số số mặt tiền (${input.facadeCount || 1} mặt): ${cornerCoef >= 0 ? '+' : ''}${cornerCoef.toFixed(4)}
= HỆ SỐ TỔNG: ${totalCoef.toFixed(4)}

KẾT QUÀ TÍNH TOÁN:
${baseMarketPrice.toLocaleString()} × ${lotSize} × ${totalCoef.toFixed(4)} = ${(baseMarketPrice * lotSize * totalCoef).toLocaleString()} VND
  `.trim();

  const formula = `Giá nhà trung bình (${baseMarketPrice.toLocaleString()} VND/m²) × Diện tích đất (${lotSize} m²) × Hệ số tổng (${totalCoef.toFixed(4)}) = ${(baseMarketPrice * lotSize * totalCoef).toLocaleString()} VND`;

  return {
    formula,
    coefficientsBreakdown,
    baseMarketPrice
  };
}

function getPriceGovPlace(input: PropertyValuationRangeInput): number {
  if (!input.price_gov) {
    console.log("No price_gov data");
    return 0;
  }

  try {
    const data = JSON.parse(input.price_gov);
    console.log("Parsed price_gov data:", data);
    
    const parseNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        // Remove dots and convert to number
        const cleaned = val.replace(/\./g, '');
        return cleaned ? parseInt(cleaned, 10) : 0;
      }
      return 0;
    };

    // Lấy giá theo VT dựa vào laneWidth
    const laneWidth = input.laneWidth || 0;
    console.log("Lane width:", laneWidth);
    
    // VT1: Mặt phố
    // VT2: Ngõ >= 4.5m
    // VT3: Ngõ 3m - <4.5m
    // VT4: Ngõ <3m
    let vtPrice = 0;
    if (laneWidth >= 8) {
      vtPrice = parseNumber(data['VT1']);
      console.log("Using VT1 price:", data['VT1'], "->", vtPrice);
    } else if (laneWidth >= 4.5) {
      vtPrice = parseNumber(data['VT2']);
      console.log("Using VT2 price:", data['VT2'], "->", vtPrice);
    } else if (laneWidth >= 3.5) {
      vtPrice = parseNumber(data['VT3']);
      console.log("Using VT3 price:", data['VT3'], "->", vtPrice);
    } else {
      vtPrice = parseNumber(data['VT4']);
      console.log("Using VT4 price:", data['VT4'], "->", vtPrice);
    }

    console.log("Final price_gov_place:", vtPrice);
    return vtPrice;
  } catch (error) {
    console.error('Error parsing price_gov:', error);
    return 0;
  }
}

export async function propertyValuationRange(input: PropertyValuationRangeInput): Promise<PropertyValuationRangeOutput> {
  // Generate pricing formula and coefficients breakdown
  const { formula, coefficientsBreakdown, baseMarketPrice } = generatePricingFormula(input);
  const price_house = calculateConstructionPrice(input);
  
  // Calculate price_gov_place based on VT rules
  const price_gov_place = getPriceGovPlace(input);
  console.log("price_gov_place: ",price_gov_place)
  
  // Extract AI real estate data from searchData
  const ai_real_estate_data = extractAIRealEstateData(input.searchData);
  console.log("ai_real_estate_data: ", ai_real_estate_data)
  
  // Prepare input for AI with calculated values
  const aiInput: PropertyValuationRangeLLMInput = {
    ...input,
    pricingFormula: formula,
    coefficientsBreakdown,
    baseMarketPrice,
    price_house,
  };

  const response = await prompt(aiInput);
  if (!response.output) {
    throw new Error('No output received from AI model');
  }
  return {
    ...response.output,
    price_gov_place,
    ai_real_estate_data,
  };
}

const PropertyValuationRangeLLMInputSchema = PropertyValuationRangeInputSchema.extend({
  pricingFormula: z.string().describe('Công thức tính giá bất động sản với hệ số'),
  coefficientsBreakdown: z.string().describe('Chi tiết phân tích các hệ số điều chỉnh giá'),
  baseMarketPrice: z.number().describe('Giá thị trường cơ bản VND/m²'),
  price_house: z.number().describe('Giá xây dựng'),
});

export type PropertyValuationRangeLLMInput = z.infer<typeof PropertyValuationRangeLLMInputSchema>;

const prompt = ai.definePrompt({
  name: 'propertyValuationRangePrompt',
  input: {schema: PropertyValuationRangeLLMInputSchema},
  output: {schema: PropertyValuationRangeOutputSchema},
  prompt: `NHIỆM VỤ: QUYẾT ĐỊNH GIÁ CUỐI CHO BẤT ĐỘNG SẢN

— **THÔNG TIN BẤT ĐỘNG SẢN**  
- Địa chỉ: {{{address}}}  
- Khu vực: {{{ward}}}, {{{district}}}, {{{city}}} (Cấp {{{administrativeLevel}}})  
- Loại: {{{type}}}  
- Ngõ trước nhà: {{{laneWidth}}} m
- Loại ngõ: {{{alleyType}}} (thong: ngõ thông, cut: ngõ cụt)
- Hướng nhà: {{{houseDirection}}} (dong: Đông, tay: Tây, nam: Nam, bac: Bắc)
- Diện tích đất: {{{lotSize}}} m²  
- Diện tích sàn: {{{size}}} m²  
- Tiện ích xung quanh: {{{amenities}}}
- Giá nhà nước (Giá tham chiếu từ Nhà nước): {{{price_gov}}} VND/m²
Chú thích về Giá nhà nước:
VT1: Thửa đất của một chủ sử dụng có ít nhất một mặt giáp đường/phố có tên trong bảng giá ban hành kèm theo Quyết định. Vị trí thuận lợi nhất.
VT2: Thửa đất có ít nhất một mặt giáp ngõ (ngách/hẻm), với mặt cắt ngõ ≥ 4,5m (tính từ chỉ giới hè đường đến mốc giới đầu tiên của thửa đất).
VT3: Giáp ngõ có mặt cắt từ 3m đến < 4,5m (tính từ chỉ giới hè đường).
VT4: Giáp ngõ có mặt cắt < 3m (tính từ chỉ giới hè đường). Vị trí kém thuận lợi nhất.
Vị trí sau luôn có điều kiện kém hơn vị trí liền trước.
Đất có nhà, bổ sung thông tin:
- Số phòng ngủ: {{{bedrooms}}}  
- Số phòng tắm: {{{bathrooms}}}  
- Số tầng: {{{storyNumber}}}  
- Năm xây dựng: {{{yearBuilt}}}  
- Tiện ích xung quanh: {{{amenities}}}

— **DỮ LIỆU THỊ TRƯỜNG**  
(Giá trung bình là giá trung bình trên 1 m2. Dữ liệu được lấy từ thông tin các khu vực tương tự với bất động sản cần định giá)
{{{marketData}}} {{{searchData}}}


— **GIÁ NHÀ NƯỚC**  
{{{price_gov}}}

— **CÔNG THỨC TÍNH GIÁ VÀ HỆ SỐ** (Có thể kiểm tra lại các thông số đã phù hợp với bất động sản cần định giá)
{{{coefficientsBreakdown}}}

— **CÔNG THỨC CHÍNH**
{{{pricingFormula}}}

— **YÊU CẦU OUTPUT**  
Dựa trên công thức tính giá và hệ số trên, hãy xác định:

1. **reasonableValue**: Sử dụng kết quả từ công thức tính giá trên
2. **lowValue**: reasonableValue × 0.90 (giá bán nhanh - giảm 10%)
3. **highValue**: reasonableValue × 1.1 (giá bán chậm - tăng 10%)  
4. **price_house**: Sử dụng đúng giá trị {{{price_house}}} VND

QUAN TRỌNG: 
- Áp dụng chính xác công thức: Giá thị trường cơ bản ({{{baseMarketPrice}}} VND/m²) × Diện tích × Hệ số tổng
- lowValue phải nhỏ hơn reasonableValue
- highValue phải lớn hơn reasonableValue  
- Tất cả giá trị phải là số nguyên (phải đầy đủ tất cả các số, không được làm tròn)
- Kiểm tra và điều chỉnh nếu cần thiết dựa trên điều kiện thị trường thực tế
`,
});

const propertyValuationRangeFlow = ai.defineFlow(
  {
    name: 'propertyValuationRangeFlow',
    inputSchema: PropertyValuationRangeInputSchema,
    outputSchema: PropertyValuationRangeOutputSchema,
  },
  async input => {
    // Generate pricing formula and coefficients breakdown
    const { formula, coefficientsBreakdown, baseMarketPrice } = generatePricingFormula(input);
    const price_house = calculateConstructionPrice(input);
    const price_gov_place = getPriceGovPlace(input);

    // Extract AI real estate data from searchData
    const ai_real_estate_data = extractAIRealEstateData(input.searchData);

    // Prepare input for AI with calculated values
    const aiInput: PropertyValuationRangeLLMInput = {
      ...input,
      pricingFormula: formula,
      coefficientsBreakdown,
      baseMarketPrice,
      price_house,
    };
    console.log("aiInput: ", aiInput)
    const response = await prompt(aiInput);
    if (!response.output) {
      throw new Error('No output received from AI model');
    }
    return {
      ...response.output,
      price_gov_place,
      ai_real_estate_data,
    };
  }
);
