'use server';

import { z } from 'zod';
import { propertyValuationRange } from '@/ai/flows/property-valuation';
import { propertySummary } from '@/ai/flows/property-summary';
import type { CombinedResult, PropertyInputSchema } from '@/lib/types';

const propertyInputSchema = z.object({
  address: z.string().min(5, 'Vui lòng nhập địa chỉ hợp lệ.'),
  size: z.coerce.number().min(10, 'Diện tích phải lớn hơn 10m².'),
  bedrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng ngủ.'),
  bathrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng tắm.'),
  lotSize: z.coerce.number().min(10, 'Diện tích lô đất phải lớn hơn 10m².'),
});

export async function getValuationAndSummary(
  data: PropertyInputSchema
): Promise<{ success: true; data: CombinedResult } | { success: false; error: string }> {
  const validatedFields = propertyInputSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.',
    };
  }

  try {
    const marketData =
      'Thị trường địa phương đang có nhu cầu cao, các bất động sản đang được bán cao hơn 5-10% so với giá yêu cầu. Các dự án hạ tầng gần đây, bao gồm một trạm tàu điện mới, đã làm tăng giá trị bất động sản trong 6 tháng qua. Đơn giá trung bình mỗi mét vuông là 65 triệu đồng.';

    const valuationPromise = propertyValuationRange({
      ...validatedFields.data,
      marketData,
    });

    const summaryDetails = {
      location: {
        score: 9,
        details:
          'Vị trí đắc địa tại trung tâm, gần khu tài chính và các địa điểm giải trí. Chỉ số đi bộ cao. Có thể có tiếng ồn từ đường phố.',
      },
      utilities: {
        score: 7,
        details:
          'Giao thông công cộng thuận tiện. Có nhiều cửa hàng tạp hóa, nhưng các cửa hàng đặc sản cần di chuyển một quãng ngắn. Một phòng khám mới vừa mở gần đây.',
      },
      planning: {
        score: 8,
        details:
          'Khu vực nằm trong kế hoạch chỉnh trang đô thị, với các công viên và không gian công cộng mới được quy hoạch. Không có công trình xây dựng lớn gây ảnh hưởng trong thời gian tới.',
      },
      legal: {
        score: 10,
        details:
          'Tình trạng pháp lý hoàn hảo với đầy đủ giấy tờ đã được xác minh (sổ đỏ chính chủ). Không có lịch sử tranh chấp hay thế chấp. Sổ sách rõ ràng.',
      },
      quality: {
        score: 7,
        details:
          'Công trình xây dựng hiện đại (xây năm 2018). Nội thất cao cấp. Các tiện ích chung của tòa nhà (phòng gym, hồ bơi) được bảo trì tốt. Có một vài hao mòn nhỏ về thẩm mỹ ở khu vực chung.',
      },
    };

    const summaryPromise = propertySummary({
      locationScore: summaryDetails.location.score,
      locationDetails: summaryDetails.location.details,
      utilitiesScore: summaryDetails.utilities.score,
      utilitiesDetails: summaryDetails.utilities.details,
      planningScore: summaryDetails.planning.score,
      planningDetails: summaryDetails.planning.details,
      legalScore: summaryDetails.legal.score,
      legalDetails: summaryDetails.legal.details,
      qualityScore: summaryDetails.quality.score,
      qualityDetails: summaryDetails.quality.details,
    });

    const [valuation, summary] = await Promise.all([
      valuationPromise,
      summaryPromise,
    ]);

    return { success: true, data: { valuation, summary, summaryDetails } };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: 'Đã xảy ra lỗi không mong muốn trong quá trình định giá. Vui lòng thử lại sau.',
    };
  }
}
