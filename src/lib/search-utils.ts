import { getProxyServerConfig, getPerplexityConfig, checkAIProviderStatus } from './config';

interface PerplexityMessage {
  role: string;
  content: string;
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AIProviderResult {
  content: string;
  provider: 'proxy' | 'perplexity';
  success: boolean;
  error?: string;
}

/**
 * Secure API call wrapper with masked logging
 */
async function makeSecureAPICall(
  url: string, 
  body: string, 
  headers: Record<string, string>,
  timeout: number,
  provider: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`🔒 Making secure API call to ${provider}`);
    console.log(`⏱️  Timeout set to ${timeout}ms`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`⚠️  ${provider} API returned ${response.status}`);
    } else {
      console.log(`✅ ${provider} API call successful`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`⏰ ${provider} API timeout after ${timeout}ms`);
      throw new Error(`${provider} API timeout`);
    }
    console.warn(`❌ ${provider} API error:`, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Call Proxy Server API (Primary provider)
 */
async function callProxyServer(userPrompt: string): Promise<AIProviderResult> {
  try {
    const proxyConfig = getProxyServerConfig();
    
    if (!proxyConfig) {
      return {
        content: '',
        provider: 'proxy',
        success: false,
        error: 'Proxy server not available or disabled'
      };
    }

    console.log('🚀 Attempting Proxy Server API call...');

    const headers = {
      "Authorization": `Bearer ${proxyConfig.apiKey}`,
      "Content-Type": "application/json",
    };

    const requestBody = JSON.stringify({
      "model": proxyConfig.model,
      "messages": [
        {
          "role": "system",
          "content": "Bạn là chuyên gia bất động sản, trả lời ngắn gọn, tập trung vào giá trị thực tế. Kết quả trả về phải là một object JSON chuẩn với các trường: - \"giá trung bình\": Giá trung bình khu vực theo đường, đơn vị VND/m2. - \"các tin rao bán\": Danh sách các tin rao bán bất động sản tương tự (cùng đường, diện tích tương tự, vị trí nhà phố/hẻm) từ các website bất động sản uy tín, mỗi tin gồm: tiêu đề, giá, diện tích, địa chỉ, link (nếu có). Không trả về bất kỳ link url ngoài trường \"link\" trong từng tin rao, không trả về text ngoài JSON."
        },
        {
          "role": "user",
          "content": userPrompt
        }
      ],
      "max_tokens": 500,
      "temperature": 0.2
    });

    const response = await makeSecureAPICall(
      proxyConfig.baseUrl,
      requestBody,
      headers,
      proxyConfig.timeout,
      'Proxy Server'
    );

    if (response.ok) {
      const data: AIResponse = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log('✅ Proxy Server API successful');
        return {
          content: data.choices[0].message.content,
          provider: 'proxy',
          success: true
        };
      } else {
        throw new Error('Invalid response format from proxy server');
      }
    } else {
      const errorText = await response.text();
      throw new Error(`Proxy server returned ${response.status}: ${errorText}`);
    }

  } catch (error) {
    console.warn('❌ Proxy Server failed:', error instanceof Error ? error.message : 'Unknown error');
    return {
      content: '',
      provider: 'proxy',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Call Perplexity AI API (Fallback provider)
 */
async function callPerplexityAPI(userPrompt: string): Promise<AIProviderResult> {
  try {
    const perplexityConfig = getPerplexityConfig();
    
    console.log('🔄 Attempting Perplexity API call (fallback)...');

    const headers = {
      "Authorization": `Bearer ${perplexityConfig.apiKey}`,
      "Content-Type": "application/json",
    };

    const requestBody = JSON.stringify({
      "model": perplexityConfig.model,
      "messages": [
        {
          "role": "system",
          "content": "Bạn là chuyên gia bất động sản, trả lời ngắn gọn, tập trung vào giá trị thực tế. Kết quả trả về phải là một object JSON chuẩn với các trường: - \"giá trung bình\": Giá trung bình khu vực theo đường, đơn vị VND/m2. - \"các tin rao bán\": Danh sách các tin rao bán bất động sản tương tự (cùng đường, diện tích tương tự, vị trí nhà phố/hẻm) từ các website bất động sản uy tín, mỗi tin gồm: tiêu đề, giá, diện tích, địa chỉ, link (nếu có). Không trả về bất kỳ link url ngoài trường \"link\" trong từng tin rao, không trả về text ngoài JSON."
        },
        {
          "role": "user",
          "content": userPrompt
        }
      ],
      "max_tokens": 500,
      "temperature": 0.2
    });

    const response = await makeSecureAPICall(
      perplexityConfig.baseUrl,
      requestBody,
      headers,
      perplexityConfig.timeout,
      'Perplexity'
    );

    if (response.ok) {
      const data: AIResponse = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log('✅ Perplexity API successful');
        return {
          content: data.choices[0].message.content,
          provider: 'perplexity',
          success: true
        };
      } else {
        throw new Error('Invalid response format from Perplexity');
      }
    } else {
      const errorText = await response.text();
      throw new Error(`Perplexity returned ${response.status}: ${errorText}`);
    }

  } catch (error) {
    console.warn('❌ Perplexity API failed:', error instanceof Error ? error.message : 'Unknown error');
    return {
      content: '',
      provider: 'perplexity',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gọi AI API với fallback mechanism: Proxy Server → Perplexity
 */
export async function searchRealEstateData(location: string, parsedAddress?: any, propertyDetails?: any, streetName?: string): Promise<string> {
  try {
    console.log('🔍 searchRealEstateData called with:', {
      location,
      streetName,
      propertyType: propertyDetails?.type,
      landArea: propertyDetails?.landArea
    });

    // Check provider availability first
    const providerStatus = checkAIProviderStatus();
    console.log('🔍 AI Provider Status:', {
      proxy: providerStatus.proxy.available ? 'Available' : 'Not Available',
      perplexity: providerStatus.perplexity.available ? 'Available' : 'Not Available'
    });
    
    const currentYear = new Date().getFullYear();
    // Lấy thông tin chi tiết
    const street = streetName || parsedAddress?.street || '';
    const ward = parsedAddress?.ward || '';
    const district = parsedAddress?.district || '';
    const city = parsedAddress?.city || '';
    const landArea = propertyDetails?.landArea || '';
    const type = propertyDetails?.type || '';
    const alleyType = propertyDetails?.alleyType || '';
    const laneWidth = propertyDetails?.laneWidth || '';

    // Map property type to Vietnamese description
    const getPropertyTypeDescription = (type: string): string => {
      const typeMap: Record<string, string> = {
        'apartment': 'chung_cu',
        'lane_house': 'nha_hem_ngo', 
        'town_house': 'nha_mat_pho',
        'land': 'ban_dat',
        'villa': 'biet_thu_lien_ke',
        'NORMAL': 'nha_mat_pho'
      };
      return typeMap[type] || type;
    };

    let userPrompt = `Tìm kiếm các bất động sản rao bán trên các website uy tín tại: Batdongsanonline.vn,  Batdongsan.com.vn, Alonhadat.com.vn,Homedy.com`;
    if (street) userPrompt += `\n- Đường: ${street}`;
    if (ward) userPrompt += `\n- Phường: ${ward}`;
    if (district) userPrompt += `\n- Quận: ${district}`;
    if (city) userPrompt += `\n- Thành phố: ${city}`;
    if (type) userPrompt += `\n- Loại bất động sản: ${getPropertyTypeDescription(type)}`;
    if (landArea) userPrompt += `\n- Diện tích: khoảng ${landArea} m2`;
    if (type || alleyType || laneWidth) {
      userPrompt += `\n- Vị trí: `;
      if (type) userPrompt += `${getPropertyTypeDescription(type)}`;
      if (alleyType) userPrompt += ` (${alleyType}`;
      if (alleyType && laneWidth) userPrompt += ", ";
      if (laneWidth) userPrompt += `lộ giới ${laneWidth}m`;
      if (alleyType) userPrompt += ")";
    }
    userPrompt += `\nTìm kiếm ưu tiên thứ tự các tin cùng đường, cùng loại bất động sản (${getPropertyTypeDescription(type)}), diện tích tương tự (±10%). Trả về đúng định dạng JSON như hướng dẫn.`;

    console.log(`🔍 Search prompt prepared (${userPrompt.length} characters)`);

    // Try Proxy Server first (Primary)
    if (providerStatus.proxy.available) {
      console.log('🚀 Trying primary provider: Proxy Server');
      const proxyResult = await callProxyServer(userPrompt);
      
      if (proxyResult.success && proxyResult.content) {
        console.log('✅ Proxy Server successful, formatting response...');
        return formatAIResponse(proxyResult.content, location, parsedAddress, 'proxy');
      } else {
        console.log('❌ Proxy Server failed, trying fallback...');
      }
    } else {
      console.log('⚠️  Proxy Server not available, skipping to fallback');
    }

    // Fallback to Perplexity
    if (providerStatus.perplexity.available) {
      console.log('🔄 Trying fallback provider: Perplexity');
      const perplexityResult = await callPerplexityAPI(userPrompt);
      
      if (perplexityResult.success && perplexityResult.content) {
        console.log('✅ Perplexity successful, formatting response...');
        return formatAIResponse(perplexityResult.content, location, parsedAddress, 'perplexity');
      } else {
        console.log('❌ Perplexity also failed');
      }
    } else {
      console.log('⚠️  Perplexity not available');
    }

    // All providers failed
    console.warn('❌ All AI providers failed');
    return '';

  } catch (error) {
    console.error('❌ Critical error in searchRealEstateData:', error);
    return '';
  }
}

/**
 * Format response từ AI thành dạng phù hợp cho AI prompt với provider info
 */
function formatAIResponse(content: string, location: string, parsedAddress?: any, provider?: string): string {
  // Tạo location context
  const locationContext = parsedAddress 
    ? `${parsedAddress.ward}, ${parsedAddress.district}, ${parsedAddress.city}` 
    : location;

  // Trích xuất thông tin giá từ response
  const priceInfo = extractPriceInfoFromContent(content);
  const trendInfo = extractTrendInfoFromContent(content);

  const providerInfo = provider ? ` (via ${provider === 'proxy' ? 'Proxy Server' : 'Perplexity'})` : '';

  return `
**Dữ liệu search được từ AI${providerInfo} về ${locationContext}:**

**Thông tin chính:**
${content}

**Thông tin giá trích xuất:**
${priceInfo}

**Xu hướng thị trường:**
${trendInfo}

**Tóm tắt:** Thông tin về bất động sản tại ${locationContext} được cập nhật từ các nguồn tin tức và dữ liệu thị trường mới nhất năm ${new Date().getFullYear()}${providerInfo}.
`.trim();
}

/**
 * Trích xuất thông tin giá từ content
 */
function extractPriceInfoFromContent(content: string): string {
  const pricePattern = /(\d+(?:\.\d+)?)\s*(triệu|tỷ|tr)/gi;
  const prices = [...content.matchAll(pricePattern)];
  
  if (prices.length > 0) {
    const priceList = prices.slice(0, 3).map(match => match[0]).join(', ');
    return `- Giá tham khảo: ${priceList}`;
  }
  
  return '- Chưa tìm thấy thông tin giá cụ thể trong kết quả.';
}

/**
 * Trích xuất thông tin xu hướng từ content
 */
function extractTrendInfoFromContent(content: string): string {
  const trendKeywords = ['tăng', 'giảm', 'ổn định', 'biến động', 'xu hướng'];
  const lines = content.split('\n');
  
  const trendLines = lines.filter(line => 
    trendKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  if (trendLines.length > 0) {
    return trendLines.slice(0, 2).map(line => `- ${line.trim()}`).join('\n');
  }
  
  return '- Thông tin xu hướng sẽ được cập nhật dựa trên dữ liệu thị trường.';
}

/**
 * Trích xuất các keywords location từ địa chỉ đầu vào
 */
function extractLocationKeywords(location: string, parsedAddress?: any): string[] {
  const keywords: string[] = [];
  
  // Thêm toàn bộ location
  keywords.push(location);
  
  // Tách các thành phần địa chỉ
  const parts = location.split(',').map(part => part.trim());
  keywords.push(...parts);
  
  // Thêm thông tin từ parsedAddress nếu có
  if (parsedAddress) {
    if (parsedAddress.city) keywords.push(parsedAddress.city);
    if (parsedAddress.district) keywords.push(parsedAddress.district);
    if (parsedAddress.ward) keywords.push(parsedAddress.ward);
  }
  
  // Thêm các từ khóa chung
  keywords.push('bắc ninh', 'từ sơn');
  
  return keywords.filter(k => k.length > 0);
}

/**
 * Lấy keywords cho tỉnh/thành phố từ parsedAddress
 */
function getCityProvinceKeywords(parsedAddress?: any): string[] {
  const keywords: string[] = [];
  
  if (!parsedAddress) return keywords;
  
  // Mapping các city codes thành tên đầy đủ
  const cityMapping: Record<string, string[]> = {
    'ha_noi': ['hà nội', 'hanoi', 'thủ đô'],
    'ho_chi_minh': ['hồ chí minh', 'ho chi minh', 'sài gòn', 'saigon'],
    'bac_ninh': ['bắc ninh', 'bac ninh'],
    'hai_phong': ['hải phòng', 'hai phong'],
    'da_nang': ['đà nẵng', 'da nang'],
    'binh_duong': ['bình dương', 'binh duong'],
    'dong_nai': ['đồng nai', 'dong nai'],
  };
  
  // Thêm từ city code
  if (parsedAddress.city && cityMapping[parsedAddress.city]) {
    keywords.push(...cityMapping[parsedAddress.city]);
  }
  
  // Thêm trực tiếp nếu không có trong mapping
  if (parsedAddress.city) {
    keywords.push(parsedAddress.city.replace(/_/g, ' '));
  }
  
  return keywords;
}

 