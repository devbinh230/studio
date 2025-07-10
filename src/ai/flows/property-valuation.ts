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
import { number } from 'zod';

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
});
export type PropertyValuationRangeInput = z.infer<typeof PropertyValuationRangeInputSchema>;

const PropertyValuationRangeOutputSchema = z.object({
  lowValue: z.number().describe('Giá thấp nhất có thể cho bất động sản.'),
  reasonableValue: z.number().describe('Giá hợp lý nhất cho bất động sản.'),
  highValue: z.number().describe('Giá cao nhất có thể đạt được cho bất động sản.'),
  price_house: z.number().describe('Giá nhà tham khảo.'),
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
  } else if (laneWidth > 0) {
    laneCoef = -0.03; // small_lane
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


  return { laneCoef, legalCoef, widthCoef, cornerCoef };
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
    wearCoef = 0.1;
  } else if (houseAge < 5) {
    wearCoef = 0.07;
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
  const priceHouse = totalFloorArea * (1 + unitPrice + wearCoef + roomCoef + toiletCoef);
  return priceHouse;
}

// Helper function to extract market price from marketData
function extractMarketPrice(marketData: string): number {
  const match = marketData.match(/Giá trung bình:\s*([\d\.]+)\s*triệu VND\/m²/);
  if (match) {
    return parseFloat(match[1]) * 1_000_000; // Convert to VND/m²
  }
  return 0;
}

// Calculate reasonableValue using price.py logic
function calculateReasonableValue(input: PropertyValuationRangeInput): number {
  const baseMarketPrice = extractMarketPrice(input.marketData);
  const lotSize = input.lotSize || 0;
  const basePrice = baseMarketPrice * lotSize;
  
  const { laneCoef, legalCoef, widthCoef, cornerCoef } = calculateCoefficients(input);
  
  const reasonableValue = basePrice * (1+laneCoef + legalCoef+ widthCoef + cornerCoef);
   
  return reasonableValue;
}

export async function propertyValuationRange(input: PropertyValuationRangeInput): Promise<PropertyValuationRangeOutput> {
  return propertyValuationRangeFlow(input);
}

// Schema mở rộng cho LLM input
const PropertyValuationRangeLLMInputSchema = PropertyValuationRangeInputSchema.extend({
  reasonableValue: z.number().describe('Giá hợp lý nhất cho bất động sản'),
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
- Diện tích đất: {{{lotSize}}} m²  
- Diện tích sàn: {{{size}}} m²  
- Tiện ích xung quanh: {{{amenities}}}
- Giá nhà nước (Giá tham chiếu từ Nhà nước): {{{price_gov}}} VND/m²
Chú thích về Giá nhà nước:
VT1: Thửa đất của một chủ sử dụng có ít nhất một mặt giáp đường/phố có tên trong bảng giá ban hành kèm theo Quyết định. Vị trí thuận lợi nhất.
VT2: Thửa đất có ít nhất một mặt giáp ngõ (ngách/hẻm), với mặt cắt ngõ ≥ 3,5m (tính từ chỉ giới hè đường đến mốc giới đầu tiên của thửa đất).
VT3: Giáp ngõ có mặt cắt từ 2m đến < 3,5m (tính từ chỉ giới hè đường).
VT4: Giáp ngõ có mặt cắt < 2m (tính từ chỉ giới hè đường). Vị trí kém thuận lợi nhất.
Vị trí sau luôn có điều kiện kém hơn vị trí liền trước.
Đất có nhà, bổ sung thêm thông tin:
- Số phòng ngủ: {{{bedrooms}}}  
- Số phòng tắm: {{{bathrooms}}}  
- Số tầng: {{{storyNumber}}}  
- Năm xây dựng: {{{yearBuilt}}}  
- Tiện ích xung quanh: {{{amenities}}}

— **DỮ LIỆU THỊ TRƯỜNG**  
{{{marketData}}} {{{searchData}}}

— **GIÁ NHÀ NƯỚC**  
{{{price_gov}}}

- reasonableValue: {{{reasonableValue}}} VND
- price_house: {{{price_house}}} VND

— **Áp dụng hệ số điều chỉnh và xác định giá cuối**  
1. **lowValue**: reasonableValue × 0.90  (giá bán nhanh), tham khảo giá nhà nước từ {{{price_gov}}} làm giá thấp nhất
2. **reasonableValue**
3. **highValue**: reasonableValue × 1.1 (giá bán chậm, ưu đãi)  
4. **price_house**: price_house

`,
});

const propertyValuationRangeFlow = ai.defineFlow(
  {
    name: 'propertyValuationRangeFlow',
    inputSchema: PropertyValuationRangeInputSchema,
    outputSchema: PropertyValuationRangeOutputSchema,
  },
  async input => {
    // Calculate reasonableValue and price_house using price.py logic
    const reasonableValue = calculateReasonableValue(input);
    const price_house = calculateConstructionPrice(input);
    
    // Prepare input for AI with calculated values
    const aiInput: PropertyValuationRangeLLMInput = {
      ...input,
      reasonableValue,
      price_house
    };

    const response = await prompt(aiInput);
    if (!response.output) {
      throw new Error('No output received from AI model');
    }
    return response.output;
  }
);
