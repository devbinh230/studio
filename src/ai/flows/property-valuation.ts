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
  storyNumber: z.number().describe('Số tầng.').optional(),
  bedrooms: z.number().describe('Số phòng ngủ.').optional(),
  bathrooms: z.number().describe('Số phòng tắm.').optional(),
  amenities: z.array(z.string()).describe('Danh sách tiện ích xung quanh (trường học, bệnh viện, trung tâm thương mại, công viên, giao thông công cộng, v.v.).').optional(),
  yearBuilt: z.number().describe('Năm xây dựng bất động sản.'),
  marketData: z.string().describe('Dữ liệu thị trường hiện tại cho các bất động sản tương đương trong khu vực.'),
  searchData: z.string().describe('Dữ liệu search được từ internet về bất động sản trong khu vực.').optional(),
  price_gov: z.string().describe('Dữ liệu giá bất động sản nhà nước').optional(),
});
export type PropertyValuationRangeInput = z.infer<typeof PropertyValuationRangeInputSchema>;

const PropertyValuationRangeOutputSchema = z.object({
  lowValue: z.number().describe('Giá thấp nhất có thể cho bất động sản.'),
  reasonableValue: z.number().describe('Giá hợp lý nhất cho bất động sản.'),
  highValue: z.number().describe('Giá cao nhất có thể đạt được cho bất động sản.'),
  price_house: z.number().describe('Giá nhà tham khảo.'),
});
export type PropertyValuationRangeOutput = z.infer<typeof PropertyValuationRangeOutputSchema>;

export async function propertyValuationRange(input: PropertyValuationRangeInput): Promise<PropertyValuationRangeOutput> {
  return propertyValuationRangeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'propertyValuationRangePrompt',
  input: {schema: PropertyValuationRangeInputSchema},
  output: {schema: PropertyValuationRangeOutputSchema},
  prompt: `NHIỆM VỤ: TÍNH TOÁN KHOẢNG GIÁ BẤT ĐỘNG SẢN
— **THÔNG TIN BẤT ĐỘNG SẢN**  
Đất nền:
- Địa chỉ: {{{address}}}  
- Khu vực: {{{ward}}}, {{{district}}}, {{{city}}} (Cấp {{{administrativeLevel}}})  
- Loại: {{{type}}}  
- Ngõ trước nhà: {{{laneWidth}}} m2
- Diện tích đất: {{{lotSize}}} m²  
- Diện tích sàn: {{{size}}} m²  
- Tiện ích xung quanh: {{{amenities}}}
- Giá nhà nước (Giá tham chiếu từ Nhà nước): {{{price_gov}}} VND/m²
Chú thích về Giá nhà nước:
- Vị trí 1 (VT1): Mặt tiền đường
- Vị trí 2 (VT2): Hẻm rộng trên 5m
- Vị trí 3 (VT3): Hẻm rộng 3m - 5m
- Vị trí 4 (VT4): Hẻm rộng dưới 3m
Đất có nhà, bổ sung thêm thông tin:
- Số phòng ngủ: {{{bedrooms}}}  
- Số phòng tắm: {{{bathrooms}}}  
- Số tầng: {{{storyNumber}}}  
- Năm xây dựng: {{{yearBuilt}}}  

— **DỮ LIỆU THỊ TRƯỜNG HIỆN TẠI** (bắt buộc tham khảo):  
{{{marketData}}} {{{searchData}}}

— **QUY TRÌNH ĐỊNH GIÁ**  
1. **Phân tích giá thị trường làm baseline**  
   - Lấy giá mới nhất từ {{{marketData}}} và {{{searchData}}} làm cơ sở.  
   Từ dữ liệu price_gov đã cung cấp, hãy xác định mức giá nhà nước phù hợp nhất với vị trí bất động sản (dựa vào Ngõ trước nhà và Đường).
   - Lưu ý quan trọng: Giá giao dịch thực tế trên thị trường thường cao hơn giá nhà nước ({{{price_gov}}}) khoảng 500% - 700%. Hãy sử dụng thông tin này để điều chỉnh nhận định ban đầu về giá thị trường.
   - Khoảng giá bất động sản dự kiến phải nằm trong khoảng ±15% so với giá trung bình thị trường thu thập được, sau khi đã cân nhắc đến sự chênh lệch so với giá nhà nước.

2. **Tính giá trị reasonableValue** 
   - Công thức:  
     GIÁ_CƠ_BẢN = GIÁ_TRUNG_BÌNH_THỊ_TRƯỜNG × Diện tích đất ({{{lotSize}}} m²)
   - Giá trị = Diện tích × Giá thị trường × Hệ số vị trí 1 x Hệ số vị trí 2 × Hệ số pháp lý x hệ số tiện ích
     - Hệ số vị trí 1:   
       - Cách trung tâm thành phố lớn khoảng 4km: 1.05-1.09
       - Cách trung tâm thành phố lớn khoảng 4-15 km: 1.02-1.05
       - Cách trung tâm thành phố lớn khoảng  hơn 15: 1
       - Đất ở nông thôn, tỉnh lẻ, không ở thành phố: 0.9
     - Hệ số vị trí 2, sử dụng thông tin {{{laneWidth}}}, nếu không đề cập là hệ số 1 :
       - Mặt phố lớn(giáp đường lớn, có vỉa hè): 1.08-1.1
       - Mặt ngõ ô tô tránh (độ rộng khoảng 5m):1.04-1.08
       - Ngõ ô tô một chiều(độ rộng khoảng 3-5m): 1-1.04
       - Ngõ nhỏ xe máy(dưới 3m): 0.97
     - Hệ số pháp lý, nếu không đề cập là hệ số 1:
      - Sổ đỏ/ sổ hồng chính chủ: 1.0
      - Đồng sở hữu/ hợp đồng: 0.8
      - Giấy viết tay: 0.55
      - Tranh chấp hoặc quy hoạch: 0.45
     - Hệ số tiện ích:
      - Có nhiều hơn 3 tiện ích xung quanh: 1.02-1.05
      - Có khoảng 1-2 tiện ích xung quanh: 1-1.02
Đảm bảo reasonableValue / lotSize nằm trong khoảng 85%–115% giá trung bình thị trường ĐÃ ĐƯỢC ĐIỀU CHỈNH và CÂN NHẮC SỰ CHÊNH LỆCH VỚI GIÁ NHÀ NƯỚC.  
3. **Tính giá trị xây dựng price_house**  
   - Tổng diện tích sàn = Diện tích đất ({{{size}}} m²) × Số tầng ({{{storyNumber}}})  
   - Giá trị xây dựng = Tổng diện tích sàn × Đơn giá xây × Hệ số hao mòn × Hệ số tiện ích
   - Đơn giá xây dựng (thành phố lớn):
   - Nhà 4–5 tầng BTCT: 7–8 triệu/m²
   - Nhà 2–3 tầng: 6–5 triệu/m²
   -Nhà cấp 4 hoặc nhà cũ: 4.5 triệu/m²
  -Hệ số hao mòn theo tuổi nhà
    - Tuổi nhà = Năm hiện tại – {{{yearBuilt}}}
     - Áp dụng hệ số: < 3 năm → 1.1–1.15
     - 3–5 năm → 1.07–1.1
     - 5–10 năm → 1.00–1.07
     - 10–20 năm → 0.90
     - Hơn 20 năm → 0.80
  - Hệ số tiện ích (dựa trên bố trí phòng)
    - < 2 phòng ngủ: -3%
    - 3–4 phòng ngủ (phù hợp diện tích): 0%
    - 4 phòng ngủ (hợp lý): +3%
    - Mỗi tầng ≥1 toilet hoặc toilet riêng phòng ngủ: +2–4%
   - Thiếu toilet (<1 toilet/tầng): -1–3%

4. **Áp dụng hệ số điều chỉnh và xác định giá cuối**  
   - lowValue = reasonableValue × 0.90  (giá bán nhanh)  
   - highValue = reasonableValue × 1.1 (giá bán chậm, ưu đãi)  
   - price_house = Giá trị xây dựng  


**VÍ DỤ TÍNH TOÁN:**
Nếu giá thị trường = 277 triệu VND/m², diện tích = 45m²
→ Giá cơ bản = 277 × 45 = 12.465 tỷ VND
→ Sau điều chỉnh loại nhà (theo các hệ số) = 13.334 tỷ VND  
→ reasonableValue = 14.334.000.000 VND


`,
});

const propertyValuationRangeFlow = ai.defineFlow(
  {
    name: 'propertyValuationRangeFlow',
    inputSchema: PropertyValuationRangeInputSchema,
    outputSchema: PropertyValuationRangeOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    if (!response.output) {
      throw new Error('No output received from AI model');
    }
    return response.output;
  }
);
