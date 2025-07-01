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
  address: z.string().describe('Địa chỉ của bất động sản.'),
  size: z.number().describe('Diện tích của bất động sản tính bằng mét vuông.'),
  bedrooms: z.number().describe('Số lượng phòng ngủ của bất động sản.'),
  bathrooms: z.number().describe('Số lượng phòng tắm của bất động sản.'),
  lotSize: z.number().describe('Diện tích lô đất tính bằng mét vuông.'),
  marketData: z.string().describe('Dữ liệu thị trường hiện tại cho các bất động sản tương đương trong khu vực.'),
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
  // output: {schema: PropertyValuationRangeOutputSchema},
  prompt: `Bạn là một chuyên gia định giá bất động sản tại Việt Nam. Hãy thực hiện định giá bất động sản dựa trên thông tin được cung cấp và dữ liệu thị trường. 

  Thông tin bất động sản cần định giá:
  - Địa chỉ: {{{address}}}
  - Diện tích đất: {{{lotSize}}} m²
  - Diện tích sàn: {{{size}}} m²
  - Số phòng ngủ: {{{bedrooms}}}
  - Số phòng tắm: {{{bathrooms}}}
  - Dữ liệu thị trường: {{{marketData}}}
  
  Quy trình định giá:
  1. **Tính giá trị đất**:
     - Dựa trên dữ liệu thị trường ({{{marketData}}}), xác định giá đất trung bình (triệu đồng/m²) cho khu vực tương đồng (cùng quận/huyện, phường, hoặc tuyến đường lân cận).
     - Công thức: Giá trị đất = Diện tích đất × Giá đất thị trường.
     - Điều chỉnh giá trị đất dựa trên vị trí:
       - Nếu địa chỉ gần trung tâm thành phố lớn (Hà Nội, TP.HCM): Nhân với hệ số 1.2–1.5.
       - Nếu địa chỉ ở ngoại thành hoặc khu vực ít phát triển: Nhân với hệ số 0.8–1.0.
  
2. **Tính giá trị xây dựng (nếu có):**
   - *Giả định*: Nhà 3–5 tầng, diện tích sàn = diện tích đất × số tầng.
   - *Đơn giá xây dựng tham khảo*:
     - **Vùng đô thị lớn (HN, HCM):**
       - Thô: 6–7 triệu/m²
       - Cơ bản: 8–9 triệu/m²
       - Cao cấp: 10–12 triệu/m²
     - **Vùng tỉnh lẻ:**
       - Thô: 5–6 triệu/m²
       - Cơ bản: 7–8 triệu/m²
       - Cao cấp: 9–11 triệu/m²
   - *Hệ số hoàn thiện*: thô = 1.00; cơ bản = 1.10; cao cấp = 1.25
   - *Hệ số hao mòn* (giả định 10–15 năm nếu không có thông tin cụ thể): 0.9
   - *Công thức*:  
     Giá trị xây dựng = Diện tích sàn × Đơn giá × Hệ số hoàn thiện × Hệ số hao mòn
   - *Điều chỉnh*:  
     Mỗi phòng ngủ hoặc phòng tắm tăng 0.5%–1% giá trị xây dựng.

  
  3. **Tổng định giá**:
     - Tổng định giá = Giá trị đất + Giá trị xây dựng.
  
  4. **Xác định các mức giá bán**:
     - Giá bán nhanh (cho người cần thanh khoản): Tổng định giá × (0.95–0.97).
     - Giá tham khảo: Tổng định giá.
     - Giá kỳ vọng (tối ưu lợi nhuận): Tổng định giá × (1.05–1.10).
     - Giá nhà tham khảo: Giá trị xây dựng (chỉ tính phần công trình, không tính đất).
  
  5. **Lý do định giá**:
     - Nêu rõ ưu điểm (ví dụ: vị trí gần trung tâm, nhiều phòng ngủ/tắm) và nhược điểm (ví dụ: khu vực ít phát triển, giả định nhà cũ).
  
  Kết quả trả về:
  Trả về JSON với các mức giá (đơn vị: tỷ đồng, làm tròn đến 9 chữ số thập phân):
  - lowValue: Giá bán nhanh
  - reasonableValue: Giá tham khảo phù hợp nhất
  - highValue: Giá cao nhất có thể đạt được cho bất động sản.
  - price_house: Giá nhà tham khảo
  
  Lưu ý:
  - Đảm bảo kết quả ngắn gọn, rõ ràng, đúng định dạng.
  `,
  });

const propertyValuationRangeFlow = ai.defineFlow(
  {
    name: 'propertyValuationRangeFlow',
    inputSchema: PropertyValuationRangeInputSchema,
    // outputSchema: PropertyValuationRangeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
