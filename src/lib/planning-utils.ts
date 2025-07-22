import { latLngToTileXY, generatePlanningMapUrls, generatePlanningMapMosaicUrls } from './utils';

/**
 * Generate a single planning image URL suitable for AI analysis.
 * Takes center coordinates and returns the most appropriate image URL.
 */
export function generateAIPlanningImageUrl(lat: number, lng: number, zoom: number = 18) {
  try {
    // Convert coordinates to tile coordinates
    const { x, y } = latLngToTileXY(lat, lng, zoom);
    
    // For AI analysis, we'll use the QH2030 map which tends to have the best coverage
    const baseUrl = 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2';
    const url = `${baseUrl}/${zoom}/${x}/${y}.png`;
    
    console.log('🧠 Generated AI planning image URL:', url);
    return url;
  } catch (error) {
    console.error('❌ Error generating AI planning image URL:', error);
    throw error;
  }
}

/**
 * Captures planning map images at specified coordinates
 */
export async function capturePlanningImages(lat: number, lng: number, options: {
  zoom?: number;
  useMosaic?: boolean;
  mapService?: boolean;
} = {}) {
  const {
    zoom = 18, // Changed from 20 to 18 (max supported zoom)
    useMosaic = false,
    mapService = false,
  } = options;

  // Ensure zoom level is within supported range (max 18)
  const safeZoom = Math.min(18, Math.max(10, zoom));
  if (safeZoom !== zoom) {
    console.warn(`⚠️ Adjusted zoom from ${zoom} to ${safeZoom} (max supported zoom is 18)`);
  }

  console.log('📷 Capturing planning map images at:', lat, lng, 'zoom:', safeZoom);

  // If mapService is true, try to get updated URLs first
  let urlTemplates = {
    qh2030: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png',
    qh500: 'https://s3-han02.fptcloud.com/guland/hn-qhxd-2/{z}/{x}/{y}.png',
    qhPK: 'https://s3-hn-2.cloud.cmctelecom.vn/guland4/hanoi-qhpk2/{z}/{x}/{y}.png'
  };

  if (mapService) {
    try {
      console.log('🌐 Fetching latest map service data...');
      const response = await fetch(`/api/map-service?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.data) {
          // Extract URLs from HTML (simplified version)
          const html = data.data.data;
          console.log('📦 Received HTML content, length:', html.length);
          
          // This would normally use DOM parsing, but here we'll just use the default URLs
          console.log('🔄 Using default URL templates');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching map service data:', error);
    }
  }

  // Generate the appropriate URLs based on options
  if (useMosaic) {
    return generatePlanningMapMosaicUrls(lat, lng, safeZoom);
  } else {
    return generatePlanningMapUrls(lat, lng, safeZoom);
  }
}

/**
 * Extracts land information from HTML content
 */
export function extractLandInfoFromHtml(html: string): string {
  try {
    // Use DOMParser in browser environment
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract key information
      const titleEl = doc.querySelector('.sqh-pin-inf__tle');
      const addressEls = doc.querySelectorAll('.sqh-pin-inf__adr');
      const typeInfoEl = doc.querySelector('.type-info');
      const typeIdEl = typeInfoEl?.querySelector('.type-info__id');
      const typeSqrEl = typeInfoEl?.querySelector('.type-info__sqr');
      const typeTxtEl = typeInfoEl?.querySelector('.type-info__txt');
      const latInput = doc.querySelector('input[name="lat"]') as HTMLInputElement;
      const lngInput = doc.querySelector('input[name="lng"]') as HTMLInputElement;
      
      // Format as plain text
      const title = titleEl?.textContent?.trim() || '';
      const addresses = Array.from(addressEls)
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .join('\n');
      const coords = (latInput && lngInput) ? 
        `Tọa độ: ${latInput.value}, ${lngInput.value}` : '';
      const landType = (typeIdEl && typeSqrEl && typeTxtEl) ?
        `Loại đất: ${typeIdEl.textContent?.trim() || ''}, Diện tích: ${typeSqrEl.textContent?.trim() || ''}, Mô tả: ${typeTxtEl.textContent?.trim() || ''}` : '';
      
      // Extract planning info
      const planningTitle = doc.querySelector('.text-tle')?.textContent?.trim() || '';
      const planningText = doc.querySelector('.text-col__txt')?.textContent?.trim() || '';
      const planning = planningText ? `${planningTitle}: ${planningText}` : '';
      
      // Combine all information into a single string
      const info = [title, addresses, coords, landType, planning]
        .filter(Boolean)
        .join('\n\n');
      
      return info || 'Không có thông tin quy hoạch';
    } else {
      // Server-side fallback using regex
      let text = '';
      
      // Extract title
      const titleMatch = html.match(/<div class="sqh-pin-inf__tle">(.*?)<\/div>/);
      if (titleMatch && titleMatch[1]) {
        text += titleMatch[1].replace(/<[^>]*>/g, '').trim() + '\n\n';
      }
      
      // Extract address
      const addressMatch = html.match(/<div class="sqh-pin-inf__adr">(.*?)<\/div>/);
      if (addressMatch && addressMatch[1]) {
        text += addressMatch[1].replace(/<[^>]*>/g, '').trim() + '\n\n';
      }
      
      // Extract coordinates
      const latMatch = html.match(/name="lat" value="([^"]+)"/);
      const lngMatch = html.match(/name="lng" value="([^"]+)"/);
      if (latMatch && lngMatch) {
        text += `Tọa độ: ${latMatch[1]}, ${lngMatch[1]}\n\n`;
      }
      
      // Extract land type
      const landTypeMatch = html.match(/<div class="type-info">(.*?)<\/div>/);
      if (landTypeMatch && landTypeMatch[1]) {
        text += landTypeMatch[1].replace(/<[^>]*>/g, '').trim() + '\n\n';
      }
      
      return text || 'Không có thông tin quy hoạch';
    }
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return 'Error processing HTML content';
  }
}

/**
 * Prepares planning data for analysis with actual image capture
 */
export async function preparePlanningAnalysisData(lat: number, lng: number) {
  try {
    let imagePath = '';

    // Check if we can capture actual image - safely check for window
    const isClient = typeof window !== 'undefined';
    const mapFunctions = isClient ? (window as any).mapFunctions : null;
    
    if (isClient && mapFunctions?.capturePlanningMapImages) {
      try {
        console.log('📷 Capturing actual map image using Leaflet...');
        const captureResult = await mapFunctions.capturePlanningMapImages(lat, lng, {
          zoom: 18,
          includeBaseMap: true,
          captureLeaflet: true
        });

        if (captureResult?.imageDataUrl) {
          // Save the captured image
          console.log('💾 Saving captured image...');
          const saveUrl = new URL('/api/save-planning-image', window.location.origin);
          const saveResponse = await fetch(saveUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: captureResult.imageDataUrl })
          });

          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            if (saveData.success && saveData.path) {
              imagePath = saveData.path;
              console.log('✅ Image saved successfully:', imagePath);
            }
          }
        }
      } catch (captureError) {
        console.error('⚠️ Error capturing/saving image:', captureError);
      }
    }

    // Fallback to generated URL if capture failed
    if (!imagePath) {
      console.log('📌 Falling back to generated URL');
      imagePath = generateAIPlanningImageUrl(lat, lng, 18);
    }

    // 2. Generate backup mosaic URLs
    const planningUrls = await capturePlanningImages(lat, lng, { 
      zoom: 18,
      useMosaic: true 
    });
    
    // 3. Get land info from planning API
    let planningData;
    if (isClient) {
      const planningUrl = new URL('/api/guland-proxy/planning', window.location.origin);
      const planningResponse = await fetch(planningUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          marker_lat: lat, 
          marker_lng: lng,
          province_id: 1 // Assuming Hanoi
        }),
      });
      
      if (!planningResponse.ok) {
        throw new Error(`Planning API error: ${planningResponse.status}`);
      }
      
      planningData = await planningResponse.json();
    } else {
      // Server-side fallback
      planningData = { success: false };
    }
    
    // 4. Extract text from HTML
    let landInfo = '';
    if (planningData?.success && planningData.data?.html) {
      landInfo = extractLandInfoFromHtml(planningData.data.html);
    } else {
      landInfo = `Địa chỉ: Không xác định\nTọa độ: ${lat}, ${lng}\nKhông có dữ liệu quy hoạch chi tiết`;
    }
    
    // 5. Return the prepared data
    return {
      imagePath, // Now either saved path or URL
      allImages: planningUrls,
      landInfo,
      raw: planningData
    };
  } catch (error) {
    console.error('Error preparing planning analysis data:', error);
    throw error;
  }
}   