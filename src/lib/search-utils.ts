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
  sources?: string[];
}

// New format with underscores (prioritized)
interface AIRealEstateDataNew {
  "gia_trung_binh": number;
  "cac_tin_rao_ban": Array<{
    "tieu_de": string;
    "gia": number;
    "dien_tich": number;
    "dia_chi": string;
    "link": string;
  }>;
}

// Old format with spaces (fallback compatibility)
interface AIRealEstateData {
  "giá trung bình": number;
  "các tin rao bán": Array<{
    "tiêu đề": string;
    "giá": number;
    "diện tích": number;
    "địa chỉ": string;
    "link": string;
  }>;
}

// Union type for both formats
type AIRealEstateDataUnion = AIRealEstateDataNew | AIRealEstateData;



interface SearchResult {
  formatted: string;
  json: AIRealEstateDataUnion | null;
  sources: string[];
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
async function callProxyServer(userPrompt: string): Promise<AIProviderResult & { sources?: string[] }> {
  try {
    const proxyConfig = getProxyServerConfig();
    
    if (!proxyConfig) {
      return {
        content: '',
        provider: 'proxy',
        success: false,
        error: 'Proxy server not available or disabled',
        sources: []
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
          "content": "Bạn là chuyên gia thẩm định giá bất động sản. Hãy trả về kết quả duy nhất dưới dạng một đối tượng JSON (không kèm văn bản hay chú thích nào khác), với cấu trúc và kiểu dữ liệu như sau:\n\n{\n  \"gia_trung_binh\": <number>,      // Giá trung bình khu vực theo đường, đơn vị VND/m2\n  \"cac_tin_rao_ban\": [             // Mảng các tin rao bán bất động sản tương tự\n    {\n      \"tieu_de\": <string>,         // Tiêu đề tin rao\n      \"gia\": <number>,    // Giá đăng bán (ví dụ: \"1200000000 VND\")\n      \"dien_tich\": <number>,       // Diện tích (m2)\n      \"dia_chi\": <string>,         // Địa chỉ chi tiết\n      \"link\": <string>             // URL dẫn đến tin (chỉ xuất link trong trường này)\n    },\n    …\n  ]\n}\n\nYêu cầu bổ sung:\n- Dữ liệu tham khảo các tin đăng trong **tháng 7 năm 2025**, ưu tiên bất động sản cùng đường, cùng loại (nhà phố/hẻm), diện tích ±20% so với yêu cầu.\n- Không xuất bất kỳ trường hay nội dung nào ngoài cấu trúc JSON nêu trên."
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
      const data: any = await response.json();
      
      // Enhanced logging to debug response structure
      console.log('🔍 DEBUG: Proxy Server response structure:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        hasSources: !!data.sources,
        sourcesLength: data.sources?.length || 0,
        topLevelKeys: Object.keys(data),
        firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : [],
        firstMessageKeys: data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : [],
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        contentPreview: data.choices?.[0]?.message?.content?.substring(0, 100) || 'NO CONTENT'
      });

      // Log sources if found
      if (data.sources && Array.isArray(data.sources)) {
        console.log('📋 SOURCES FOUND:', {
          count: data.sources.length,
          firstFew: data.sources.slice(0, 3),
          sampleSources: data.sources.slice(0, 5).map((s: string) => s.substring(0, 50) + '...')
        });
      } else {
        console.log('❌ NO SOURCES in response');
      }
      
      // Primary validation path
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        const content = data.choices[0].message.content.trim();
        if (content.length > 0) {
          console.log('✅ Proxy Server API successful');
          return {
            content: content,
            provider: 'proxy',
            success: true,
            sources: data.sources || []
          };
        } else {
          console.warn('⚠️  Proxy Server returned empty content');
        }
      }
      
      // Fallback: try to extract content from different response formats
      console.log('🔄 Trying alternative response format extraction...');
      
      // Try direct content field
      if ((data as any).content) {
        console.log('✅ Found content in direct field');
        return {
          content: (data as any).content,
          provider: 'proxy',
          success: true,
          sources: data.sources || []
        };
      }
      
      // Try first choice without message wrapper
      if (data.choices && data.choices[0] && typeof data.choices[0] === 'string') {
        console.log('✅ Found content in first choice string');
        return {
          content: data.choices[0] as string,
          provider: 'proxy',
          success: true,
          sources: data.sources || []
        };
      }
      
      // Last resort: log full response and throw error
      console.error('❌ Invalid response format from proxy server:', JSON.stringify(data, null, 2));
      throw new Error(`Invalid response format from proxy server: ${JSON.stringify(data)}`);
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
      error: error instanceof Error ? error.message : 'Unknown error',
      sources: []
    };
  }
}

/**
 * Call Perplexity AI API (Fallback provider)
 */
async function callPerplexityAPI(userPrompt: string): Promise<AIProviderResult & { sources?: string[] }> {
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
          "content": "Bạn là chuyên gia thẩm định giá bất động sản, output ngắn gọn, tập trung vào giá trị thực tế. Kết quả trả về phải là một object JSON với các trường: - \"giá trung bình\": Giá trung bình khu vực theo đường, đơn vị VND/m2. - \"các tin rao bán\": Danh sách các tin rao bán bất động sản tương tự (cùng đường, diện tích tương tự (không bắt buộc), vị trí nhà phố/hẻm) từ các website bất động sản uy tín, mỗi tin gồm: tiêu đề, giá, diện tích, địa chỉ, link. Các dữ liệu cần được xem xét về yếu tố thời gian trong năm 2025. Không trả về bất kỳ link url ngoài trường \"link\" trong từng tin rao, không trả về text ngoài JSON."
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
      const data: any = await response.json();
      
      // Debug logging for Perplexity response
      console.log('🔍 DEBUG: Perplexity response structure:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        hasSources: !!data.sources,
        sourcesLength: data.sources?.length || 0,
        topLevelKeys: Object.keys(data),
        contentLength: data.choices?.[0]?.message?.content?.length || 0
      });

      // Log sources if found
      if (data.sources && Array.isArray(data.sources)) {
        console.log('📋 PERPLEXITY SOURCES FOUND:', {
          count: data.sources.length,
          firstFew: data.sources.slice(0, 3),
          sampleSources: data.sources.slice(0, 5).map((s: string) => s.substring(0, 50) + '...')
        });
      } else {
        console.log('❌ NO SOURCES in Perplexity response');
      }
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log('✅ Perplexity API successful');
        return {
          content: data.choices[0].message.content,
          provider: 'perplexity',
          success: true,
          sources: data.sources || []
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
      error: error instanceof Error ? error.message : 'Unknown error',
      sources: []
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

    // Format: địa chỉ gốc + thông tin chi tiết + loại bất động sản
    let userPrompt = `Tìm kiếm các bất động sản tại "${location}"`;
    
    // Thêm thông tin chi tiết nếu có
    const detailParts = [];
    if (street) detailParts.push(`đường ${street}`);
    if (ward) detailParts.push(`phường ${ward}`);
    if (district) detailParts.push(`quận ${district}`);
    if (city) detailParts.push(`${city}`);
    
    if (detailParts.length > 0) {
      userPrompt += ` (${detailParts.join(', ')})`;
    }
    
    if (type) userPrompt += ` loại ${getPropertyTypeDescription(type)}`;
    if (landArea) userPrompt += ` diện tích khoảng ${landArea} m2`;

    userPrompt += `. Tìm kiếm ưu tiên thứ tự: 1) Cùng đường/khu vực, 2) Cùng loại bất động sản (${getPropertyTypeDescription(type)}), 3) Diện tích tương tự (±10%), 4) Các khu vực lân cận tương tự. Trả về đúng định dạng JSON như hướng dẫn.`;

    console.log(`🔍 Search prompt prepared (${userPrompt.length} characters)`);

    // Try Proxy Server first (Primary)
    let primaryResult = null;
    if (providerStatus.proxy.available) {
      console.log('🚀 Trying primary provider: Proxy Server');
      const proxyResult = await callProxyServer(userPrompt);
      
      if (proxyResult.success && proxyResult.content) {
        console.log('✅ Proxy Server successful, formatting response...');
        return formatAIResponse(proxyResult.content, location, parsedAddress, 'proxy');
      } else {
        // Store result for potential retry, but continue to fallback
        primaryResult = proxyResult;
        const errMsg = proxyResult.error || 'Proxy Server call failed without specific error';
        console.error(`❌ Proxy Server available but failed: ${errMsg}`);
        console.log('🔄 Will try fallback provider...');
      }
    } else {
      console.log('⚠️  Proxy Server not available, considering fallback provider');
    }

    // Try fallback when primary fails OR is not available
    if (providerStatus.perplexity.available) {
      console.log('🔄 Trying fallback provider: Perplexity');
      const perplexityResult = await callPerplexityAPI(userPrompt);
      
      if (perplexityResult.success && perplexityResult.content) {
        console.log('✅ Perplexity successful, formatting response...');
        return formatAIResponse(perplexityResult.content, location, parsedAddress, 'perplexity');
      } else {
        console.error('❌ Perplexity failed as fallback');
      }
    } else {
      console.log('⚠️  No fallback providers available');
    }

    // If we get here, all providers failed
    // But check if primary provider had some content we can use
    if (primaryResult && primaryResult.content) {
      console.log('⚡ Using partial data from failed primary provider as last resort...');
      return formatAIResponse(primaryResult.content, location, parsedAddress, 'proxy-partial');
    }

    // All providers failed or unavailable
    console.warn('❌ All AI providers failed or were unavailable');
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
**Dữ liệu search được từ AI về ${locationContext}:**

**Thông tin chính:**
${content}
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



/**
 * Parse JSON from AI response content
 */
function parseAIResponseJSON(content: string): AIRealEstateDataUnion | null {
  try {
    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('❌ No JSON found in AI response');
      return null;
    }

    const jsonStr = jsonMatch[0];
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.warn('❌ JSON.parse error:', err);
      return null;
    }
    
    // Prioritize new format with underscores
    if (parsed && typeof parsed === 'object' && parsed["cac_tin_rao_ban"]) {
      console.log('✅ Parsed AI JSON (new underscore format):', {
        avgPrice: parsed["gia_trung_binh"],
        listings: parsed["cac_tin_rao_ban"].length
      });
      return parsed as AIRealEstateDataNew;
    }
    
    // Fallback to old format with spaces for compatibility
    if (parsed && typeof parsed === 'object' && 
        'giá trung bình' in parsed && 
        'các tin rao bán' in parsed &&
        Array.isArray(parsed['các tin rao bán'])) {
      console.log('✅ Successfully parsed AI JSON response (old format):', {
        avgPrice: parsed['giá trung bình'],
        listings: parsed['các tin rao bán'].length
      });
      return parsed as AIRealEstateData;
    }

    console.warn('❌ Invalid JSON structure in AI response');
    return null;
  } catch (error) {
    console.warn('❌ Failed to parse JSON from AI response:', error);
    return null;
  }
}

/**
 * Enhanced searchRealEstateData that returns both formatted string and parsed JSON
 */
export async function searchRealEstateDataEnhanced(location: string, parsedAddress?: any, propertyDetails?: any, streetName?: string): Promise<SearchResult> {
  try {
    console.log('🔍 searchRealEstateDataEnhanced called with:', {
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

    // Format: địa chỉ gốc + thông tin chi tiết + loại bất động sản
    let userPrompt = `Tìm kiếm các bất động sản tại "${location}"`;
    
    // Thêm thông tin chi tiết nếu có
    const detailParts = [];
    if (street) detailParts.push(`đường ${street}`);
    if (ward) detailParts.push(`phường ${ward}`);
    if (district) detailParts.push(`quận ${district}`);
    if (city) detailParts.push(`${city}`);
    
    if (detailParts.length > 0) {
      userPrompt += ` (${detailParts.join(', ')})`;
    }
    
    if (type) userPrompt += ` loại ${getPropertyTypeDescription(type)}`;
    if (landArea) userPrompt += ` diện tích khoảng ${landArea} m2`;

    userPrompt += `. Tìm kiếm ưu tiên thứ tự: 1) Cùng đường/khu vực, 2) Cùng loại bất động sản (${getPropertyTypeDescription(type)}), 3) Diện tích tương tự (±10%), 4) Các khu vực lân cận tương tự. Trả về đúng định dạng JSON như hướng dẫn.`;

    console.log(`🔍 Search prompt prepared (${userPrompt.length} characters)`);

    let content = '';
    let provider = '';
    let sources: string[] = [];

    // Try Proxy Server first (Primary)
    let primaryResult = null;
    if (providerStatus.proxy.available) {
      console.log('🚀 Trying primary provider: Proxy Server');
      const proxyResult = await callProxyServer(userPrompt);
      
      if (proxyResult.success && proxyResult.content) {
        console.log('✅ Proxy Server successful');
        content = proxyResult.content;
        provider = 'proxy';
        sources = proxyResult.sources || [];
        console.log(`📋 Got ${sources.length} sources from Proxy Server`);
      } else {
        primaryResult = proxyResult;
        const errMsg = proxyResult.error || 'Proxy Server call failed without specific error';
        console.error(`❌ Proxy Server available but failed: ${errMsg}`);
        console.log('🔄 Will try fallback provider...');
      }
    } else {
      console.log('⚠️  Proxy Server not available, considering fallback provider');
    }

    // Try fallback when primary fails OR is not available
    if (!content && providerStatus.perplexity.available) {
      console.log('🔄 Trying fallback provider: Perplexity');
      const perplexityResult = await callPerplexityAPI(userPrompt);
      
      if (perplexityResult.success && perplexityResult.content) {
        console.log('✅ Perplexity successful');
        content = perplexityResult.content;
        provider = 'perplexity';
        sources = perplexityResult.sources || [];
        console.log(`📋 Got ${sources.length} sources from Perplexity`);
      } else {
        console.error('❌ Perplexity failed as fallback');
      }
    }

    // If we get here and still no content, check if primary provider had some content
    if (!content && primaryResult && primaryResult.content) {
      console.log('⚡ Using partial data from failed primary provider as last resort...');
      content = primaryResult.content;
      provider = 'proxy-partial';
      sources = (primaryResult as any).sources || [];
      console.log(`📋 Got ${sources.length} sources from fallback primary result`);
    }

    // Process the content if we have any
    if (content) {
      const parsedJSON = parseAIResponseJSON(content);
      const formatted = formatAIResponse(content, location, parsedAddress, provider);
      
      // Clean and validate sources
      const cleanSources = sources.filter((url: string) => {
        try {
          // Remove trailing backslashes before validation
          const cleanUrl = url.replace(/\\+$/, '');
          new URL(cleanUrl);
          return cleanUrl.startsWith('http');
        } catch {
          return false;
        }
      }).map((url: string) => url.replace(/\\+$/, '')); // Clean all URLs
      
      console.log(`🔍 Final sources count: ${cleanSources.length} valid URLs`);
      if (cleanSources.length > 0) {
        console.log('📋 Sample sources:', cleanSources.slice(0, 3));
      }
      
      return {
        formatted,
        json: parsedJSON,
        sources: cleanSources
      };
    }

    // All providers failed or unavailable
    console.warn('❌ All AI providers failed or were unavailable');
    return {
      formatted: '',
      json: null,
      sources: []
    };

  } catch (error) {
    console.error('❌ Critical error in searchRealEstateDataEnhanced:', error);
    return {
      formatted: '',
      json: null,
      sources: []
    };
  }
}