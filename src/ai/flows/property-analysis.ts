'use server';
/**
 * @fileOverview Generates comprehensive property analysis with radar scoring and detailed descriptions.
 *
 * - propertyAnalysis - A function that generates the property analysis with radar scores.
 * - PropertyAnalysisInput - The input type for the propertyAnalysis function.
 * - PropertyAnalysisOutput - The return type for the propertyAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PropertyAnalysisInputSchema = z.object({
  address: z.string().describe('Địa chỉ chi tiết của bất động sản (có thể để trống nếu đã cung cấp city/district/ward).').optional(),
  city: z.string().describe('Thành phố/Tỉnh.'),
  district: z.string().describe('Quận/Huyện.'),
  ward: z.string().describe('Phường/Xã.'),
  administrativeLevel: z.number().describe('Cấp hành chính (0: đô thị trung ương, 1: tỉnh, ...).'),
  type: z.string().describe('Loại bất động sản (ví dụ: lane_house, apartment, NORMAL, v.v.).'),
  size: z.number().describe('Diện tích xây dựng (m²).'),
  lotSize: z.number().describe('Diện tích lô đất (m²).'),
  landArea: z.number().describe('Diện tích đất (m²).'),
  houseArea: z.number().describe('Diện tích sàn xây dựng (m²).'),
  laneWidth: z.number().describe('Chiều rộng hẻm/đường vào (m).'),
  roadWidth: z.string().describe('Loại đường (ngo_ngach, ngo_oto_do_cua, ngo_1_oto, mat_pho, v.v.).').optional(),
  buildingArea: z.number().describe('Diện tích xây dựng (m²).').optional(),
  facadeWidth: z.number().describe('Chiều rộng mặt tiền (m).'),
  bedrooms: z.number().describe('Số phòng ngủ.').optional(),
  bathrooms: z.number().describe('Số phòng tắm.').optional(),
  amenities: z.array(z.string()).describe('Danh sách tiện ích xung quanh (trường học, bệnh viện, trung tâm thương mại, công viên, giao thông công cộng, v.v.).'),
  storyNumber: z.number().describe('Số tầng của bất động sản.'),
  legal: z.string().describe('Tình trạng pháp lý (sổ đỏ, hợp đồng, v.v.).'),
  legalIssues: z.array(z.string()).describe('Các vấn đề pháp lý cụ thể (xay_lan_hang_xom, so_chung_tranh_chap, v.v.).').optional(),
  yearBuilt: z.number().describe('Năm xây dựng bất động sản.'),
  marketData: z.string().describe('Dữ liệu thị trường hiện tại cho các bất động sản tương đương trong khu vực.'),
  searchData: z.string().describe('Dữ liệu search được từ internet về bất động sản trong khu vực.').optional(),
  alleyType: z.string().describe('Loại ngõ (thong: ngõ thông, cut: ngõ cụt).').optional(),
  houseDirection: z.string().describe('Hướng nhà (dong, tay, nam, bac).').optional(),
  soShape: z.string().describe('Hình dáng lô đất (vuong, no_hau, thop_hau, phuc_tap).').optional(),
  constructionLevel: z.string().describe('Mức độ xây dựng (noi_that_co_ban, noi_that_cao_cap, xay_tho, noi_that_day_du).').optional(),
  houseQuality: z.string().describe('Chất lượng nhà còn lại (30, 40, 50, 60, 70, 80, 90, 100 phần trăm).').optional(),
  disadvantages: z.array(z.string()).describe('Danh sách các đặc điểm bất lợi của bất động sản.').optional(),
  advantages: z.array(z.string()).describe('Danh sách các ưu điểm của bất động sản.').optional(),
});
export type PropertyAnalysisInput = z.infer<typeof PropertyAnalysisInputSchema>;

const PropertyAnalysisOutputSchema = z.object({
  radarScore: z.object({
    legalityScore: z.number().describe('Điểm pháp lý của bất động sản (1-10).'),
    liquidityScore: z.number().describe('Điểm thanh khoản của bất động sản (1-10).'),
    locationScore: z.number().describe('Điểm vị trí của bất động sản (1-10).'),
    evaluationScore: z.number().describe('Điểm thẩm định giá của bất động sản (1-10).'),
    dividendScore: z.number().describe('Điểm lợi nhuận/sinh lời của bất động sản (1-10).'),
    descriptions: z.array(z.string()).describe('5 mô tả ngắn tương ứng với từng tiêu chí: pháp lý, thanh khoản, vị trí, thẩm định giá, lợi nhuận.'),
  }),
});
export type PropertyAnalysisOutput = z.infer<typeof PropertyAnalysisOutputSchema>;

export async function propertyAnalysis(input: PropertyAnalysisInput): Promise<PropertyAnalysisOutput> {
  return propertyAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertyAnalysisPrompt',
  input: {schema: PropertyAnalysisInputSchema},
  output: {schema: PropertyAnalysisOutputSchema},
  prompt: `Phân tích BĐS và tạo radar score (5 tiêu chí). Dựa trên thông tin đầu vào, dữ liệu thị trường và dữ liệu search:

**Thông tin từ input:**
- Loại: {{{type}}}
- Địa chỉ: {{{address}}}
- Diện tích: Đất {{{landArea}}}m² / Sàn {{{houseArea}}}m² / Lô {{{lotSize}}}m² / Sử dụng {{{size}}}m²
- Kích thước: Lộ giới {{{laneWidth}}}m / Mặt tiền {{{facadeWidth}}}m
- Thiết kế: {{{storyNumber}}} tầng | {{{bedrooms}}} phòng ngủ | {{{bathrooms}}} phòng tắm
- Pháp lý: {{{legal}}}
- Năm xây dựng: {{{yearBuilt}}}
- Tiện ích: {{{amenities}}}
- Khu vực: {{{ward}}}, {{{district}}}, {{{city}}} (Cấp {{{administrativeLevel}}})
- Loại ngõ: {{{alleyType}}} (thong: ngõ thông, cut: ngõ cụt)
- Hướng nhà: {{{houseDirection}}} (dong: Đông, tay: Tây, nam: Nam, bac: Bắc)
- Hình dáng lô đất: {{{soShape}}} (vuong: vuông, no_hau: nở hậu, thop_hau: thóp hậu, phuc_tap: phức tạp)
- Loại đường: {{{roadWidth}}}
- Mức độ xây dựng: {{{constructionLevel}}}
- Chất lượng nhà còn lại: {{{houseQuality}}}%
- Vấn đề pháp lý: {{{legalIssues}}}
- Đặc điểm bất lợi: {{{disadvantages}}}
- Ưu điểm: {{{advantages}}}

**Dữ liệu thị trường:**
{{{marketData}}}

**Dữ liệu search được:**
{{{searchData}}}

**Yêu cầu:**
Phân tích chi tiết từ marketData (giá trung bình, số giao dịch theo năm) + searchData (thông tin thị trường internet) + thông tin input để tạo 5 điểm (1-10) + 5 mô tả ngắn (1 câu/mục):

1. **legalityScore** – Phân tích theo loại sổ:
   - Sổ đỏ (red_book): 9-10 điểm (pháp lý hoàn hảo)
   - Sổ hồng (pink_book): 7-8 điểm (pháp lý tốt, có thể chuyển đổi)
   - Hợp đồng (contract): 4-6 điểm (rủi ro pháp lý cao)
   - Sổ trắng (white_book): 2-4 điểm (không được công nhận)
   - Nếu có legalIssues, giảm điểm tùy mức độ nghiêm trọng

2. **liquidityScore** – Dựa trên marketData (số giao dịch/năm) + đặc điểm vật lý:
   - Phân tích xu hướng giao dịch từ marketData
   - Mặt tiền rộng ({{{facadeWidth}}}m) + đường rộng ({{{laneWidth}}}m) = thanh khoản cao
   - Loại nhà phổ biến (lane_house, apartment) = dễ bán hơn villa, đất trống
   - Xem xét disadvantages và advantages để đánh giá tính thanh khoản

3. **locationScore** – Phân tích địa danh cụ thể:
   - Tên đường/phố trong {{{address}}} (đường lớn = điểm cao)
   - Phường {{{ward}}} + Quận {{{district}}} + TP {{{city}}} (trung tâm = điểm cao)
   - Cấp hành chính {{{administrativeLevel}}} (0=TW cao nhất, 1=tỉnh thấp hơn)
   - Hướng nhà {{{houseDirection}}} :  Nam, Đông điểm cao do đón gió quanh năm, Tây, Bắc điểm thấp do nắng gắt, nhiệt độ cao
   - Loại đường {{{roadWidth}}}: mat_pho cao nhất, ngo_ngach thấp nhất
   - Đánh giá based on disadvantages và advantages về vị trí

4. **evaluationScore** – Dựa trên marketData chi tiết:
   - So sánh giá hiện tại với giá trung bình trong marketData
   - Phân tích biến động giá theo loại BĐS ({{{type}}})
   - Đánh giá độ chính xác định giá dựa trên số lượng giao dịch tham khảo
   - Xem xét tình trạng nhà: constructionLevel, houseQuality

5. **dividendScore** – Tiềm năng sinh lời từ marketData:
   - Xu hướng tăng/giảm giá từ dữ liệu lịch sử trong marketData
   - Tỷ suất cho thuê theo loại nhà và vị trí cụ thể
   - Tiềm năng tăng giá dựa trên số giao dịch và thanh khoản thị trường
   - Đánh giá dựa trên advantages và disadvantages
Trả về object radarScore gồm 5 score và descriptions. Tiếng Việt, ngắn gọn và súc tích.`,
});

const propertyAnalysisFlow = ai.defineFlow(
  {
    name: 'propertyAnalysisFlow',
    inputSchema: PropertyAnalysisInputSchema,
    outputSchema: PropertyAnalysisOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    if (!response.output) {
      throw new Error('No output received from AI model');
    }
    return response.output;
  }
);
