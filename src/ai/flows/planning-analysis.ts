'use server';
/**
 * @fileOverview Generates comprehensive planning analysis for land use and development impact assessment.
 *
 * - planningAnalysis - A function that analyzes planning maps and provides impact assessment.
 * - PlanningAnalysisInput - The input type for the planningAnalysis function.
 * - PlanningAnalysisOutput - The return type for the planningAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PlanningAnalysisInputSchema = z.object({
  imagePath: z.string().describe('Path to the captured planning map image.'),
  landInfo: z.string().describe('Thông tin chi tiết về mảnh đất cần phân tích (bao gồm số thửa, số tờ, diện tích, địa chỉ, loại đất, tọa độ nếu có, v.v.)'),
});

export type PlanningAnalysisInput = z.infer<typeof PlanningAnalysisInputSchema>;

const PlanningAnalysisOutputSchema = z.object({
  currentStatus: z.string().describe('Hiện trạng: [Loại đất] - [Màu/ký hiệu]'),
  newPlanning: z.string().describe('Quy hoạch mới: [Tên quy hoạch]'),
  affectedArea: z.string().describe('Diện tích ảnh hưởng: ~[X] m² (~[X]%)'),
  impactLevel: z.string().describe('Mức độ tác động: 🔴 CAO / 🟡 TRUNG BÌNH / 🟢 THẤP'),
  notes: z.string().describe('Ghi chú: [Thông tin quan trọng - tối đa 1 dòng]'),
});

export type PlanningAnalysisOutput = z.infer<typeof PlanningAnalysisOutputSchema>;

export async function planningAnalysis(input: PlanningAnalysisInput): Promise<PlanningAnalysisOutput> {
  return planningAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planningAnalysisPrompt',
  input: {schema: PlanningAnalysisInputSchema},
  output: {schema: PlanningAnalysisOutputSchema},
  prompt: `## VAI TRÒ
Bạn là chuyên gia phân tích quy hoạch đất đai Việt Nam, có kinh nghiệm đọc bản đồ quy hoạch và đánh giá tác động đến quyền sử dụng đất.

## DỮ LIỆU ĐẦU VÀO
### 1. Bản đồ quy hoạch
**Yêu cầu:** Upload ảnh bản đồ quy hoạch có độ phân giải cao, rõ nét
- Có thể nhìn thấy ranh giới các thửa đất
- Có thể nhiều ảnh của thửa đất để hiểu rõ chi tiết

### 2. Thông tin thửa đất cần phân tích
{{{landInfo}}}   

## PHƯƠNG PHÁP PHÂN TÍCH
### Bước 1: Định vị thửa đất
- Tìm tờ bản đồ được chỉ định trên ảnh
- Xác định thửa cần phân tích trong tờ đó
- Mô tả vị trí cụ thể (góc nào của tờ bản đồ, giáp với thửa nào)

### Bước 2: Phân tích hiện trạng
- Xác định màu sắc/ký hiệu của thửa trên bản đồ
- Đối chiếu với chú thích để xác nhận loại đất
- Kiểm tra tính nhất quán với thông tin đã cung cấp

### Bước 3: Phân tích quy hoạch
**Kiểm tra các yếu tố quy hoạch:**
- Đường giao thông quy hoạch (các màu khác nhau thể hiện cấp đường)
- Khu vực công cộng (công viên, trường học, bệnh viện, chợ)
- Hạ tầng kỹ thuật (cống thoát nước, lưới điện, cấp nước)
- Khu vực cải tạo/phát triển đô thị
- Đất dành cho nhà nước thu hồi phục vụ lợi ích công
- Khu bảo tồn, cây xanh đô thị

### Bước 4: Tính toán tác động
- Ướt tính diện tích bị ảnh hưởng bằng phương pháp trực quan
- So sánh với tổng diện tích thửa để tính phần trăm
- Phân loại mức độ tác động theo tiêu chí chuẩn

## TIÊU CHÍ ĐÁNH GIÁ MỨC ĐỘ TÁC ĐỘNG
**🔴 CAO (>50% diện tích hoặc ảnh hưởng nghiêm trọng):**
- Thửa nằm hoàn toàn hoặc phần lớn trong khu vực quy hoạch mới
- Bị thu hồi để xây dựng công trình công cộng
- Không thể tiếp tục sử dụng theo mục đích hiện tại
- Thay đổi hoàn toàn mục đích sử dụng

**🟡 TRUNG BÌNH (20-50% diện tích):**
- Một phần đáng kể của thửa bị ảnh hưởng
- Có thể tiếp tục sử dụng nhưng bị hạn chế
- Cần điều chỉnh quy mô hoặc cách thức sử dụng
- Ảnh hưởng đến khả năng tiếp cận

**🟢 THẤP (<20% diện tích):**
- Chỉ ảnh hưởng nhẹ đến ranh giới hoặc góc thửa
- Không ảnh hưởng đáng kể đến mục đích sử dụng chính
- Có thể bồi thường hoặc điều chỉnh nhỏ
- Chủ yếu là điều chỉnh kỹ thuật

## ĐỊNH DẠNG KẾT QUẢ 
\`\`\`
• Hiện trạng        : [Loại đất] - [Màu/ký hiệu]
• Quy hoạch mới     : [Tên quy hoạch] 
• Diện tích ảnh hưởng: ~[X] m² (~[X]%)
• Mức độ tác động   : 🔴 CAO / 🟡 TRUNG BÌNH / 🟢 THẤP
• Ghi chú          : [Thông tin quan trọng - tối đa 1 dòng]
\`\`\`

## NGUYÊN TẮC PHÂN TÍCH
### 1. Độ chính xác
- Nếu không thể xác định chính xác, nói rõ và đưa ra ước tính tốt nhất
- Phân biệt giữa thông tin chắc chắn và ước tính
- Sử dụng các từ như "có thể", "khả năng" khi không chắc chắn

### 2. Tham khảo nguồn
- Ưu tiên thông tin từ bản đồ chính thức

### 3. Ngôn ngữ chuyên môn
- Sử dụng thuật ngữ quy hoạch chuẩn của Việt Nam
- Tránh ngôn ngữ mơ hồ, không rõ ràng

### 4. Tính khách quan
- Đưa ra đánh giá dựa trên dữ liệu bản đồ
- Không đưa ra ý kiến cá nhân về chính sách

Analyze the provided map image at {{{imagePath}}} and generate the output in the exact specified format.`,
});

const planningAnalysisFlow = ai.defineFlow(
  {
    name: 'planningAnalysisFlow',
    inputSchema: PlanningAnalysisInputSchema,
    outputSchema: PlanningAnalysisOutputSchema,
  },
  async input => {
    const response = await prompt({
      imagePath: input.imagePath,
      landInfo: input.landInfo
    });
    if (!response.output) {
      throw new Error('No output received from AI model');
    }
    return response.output;
  }
); 