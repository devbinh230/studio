'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { getGeoapifyApiKey } from '@/lib/config';

// Interface for planning data
interface PlanningData {
  success: boolean;
  data?: {
    status: number;
    points: Array<{ lat: number; lng: number }>;

    address: string;
    id: number;
    province_id: string;
    district_id: string;
    ward_id: string;
    html: string;
  };
  message?: string;
  status_code?: number;
}

// Component for handling map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component for parsing and displaying HTML content
function PlanningInfoDisplay({ htmlContent }: { htmlContent: string }) {  const [parsedInfo, setParsedInfo] = useState<{
    title: string;
    address: string;
    planningInfo: Array<{ area: string; type: string; details: string; color: string }>;
    coordinates: { lat: number; lng: number } | null;
    itemId: string;
    landType: { id: string; area: string; description: string } | null;
  } | null>(null);
  useEffect(() => {
    if (htmlContent) {
      try {
        console.log('Raw HTML content:', htmlContent); // Debug log
        
        // Parse HTML and extract useful information
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Extract title (thông tin thửa đất)
        const titleElement = doc.querySelector('.sqh-pin-inf__tle');
        const title = titleElement?.textContent?.trim() || '';
        
        // Extract address (địa chỉ)
        const addressElement = doc.querySelector('.sqh-pin-inf__adr');
        const address = addressElement?.textContent?.trim() || '';
        
        // Extract coordinates from hidden form fields
        const latInput = doc.querySelector('input[name="lat"]') as HTMLInputElement;
        const lngInput = doc.querySelector('input[name="lng"]') as HTMLInputElement;
        const itemIdInput = doc.querySelector('input[name="item_id"]') as HTMLInputElement;
        
        const coordinates = latInput && lngInput ? {
          lat: parseFloat(latInput.value),
          lng: parseFloat(lngInput.value)
        } : null;
          const itemId = itemIdInput?.value || '';
        
        // Extract land type info (.type-info)
        const typeInfoElement = doc.querySelector('.type-info');
        let landType = null;
        if (typeInfoElement) {
          const typeId = typeInfoElement.querySelector('.type-info__id')?.textContent?.trim() || '';
          const typeArea = typeInfoElement.querySelector('.type-info__sqr')?.textContent?.trim() || '';
          const typeDescription = typeInfoElement.querySelector('.type-info__txt')?.textContent?.trim() || '';
          landType = { id: typeId, area: typeArea, description: typeDescription };
        }
        
        // Extract planning info - Try multiple methods
        let planningInfo: Array<{ area: string; type: string; details: string; color: string }> = [];
        
        // Method 1: Original format with .text-col and .text-col__lbl
        const textCols = Array.from(doc.querySelectorAll('.text-col'));
        if (textCols.length > 0) {
          planningInfo = textCols.map(col => {
            const areaElement = col.querySelector('.text-col__lbl');
            const area = areaElement?.textContent?.trim() || '';
            
            const typeElement = col.querySelector('.text-col__txt div[style*="background-color"]');
            const type = typeElement?.textContent?.trim() || '';
            
            // Extract background color from style attribute
            const styleAttr = typeElement?.getAttribute('style') || '';
            const colorMatch = styleAttr.match(/background-color:\s*([^;]+)/);
            const color = colorMatch ? colorMatch[1].trim() : '#gray';
            
            // Get details from the second div in text-col__txt
            const detailsElement = col.querySelector('.text-col__txt div:last-child');
            const details = detailsElement?.textContent?.trim() || '';
            
            return { area, type, details, color };
          }).filter(item => item.area && item.type);
        }
        
        // Method 2: New format with .text-col__txt having style directly
        if (planningInfo.length === 0) {
          const directStyleElements = Array.from(doc.querySelectorAll('.text-col__txt[style*="background-color"]'));
          planningInfo = directStyleElements.map((element) => {
            const type = element.textContent?.trim() || '';
            const styleAttr = element.getAttribute('style') || '';
            const colorMatch = styleAttr.match(/background-color:\s*([^;]+)/);
            const color = colorMatch ? colorMatch[1].trim() : '#gray';
            
            // For new format, area might be in the title or we use 'N/A'
            const area = 'Xem thông tin thửa đất'; // Fallback
            
            return { area, type, details: '', color };
          }).filter(item => item.type);
        }        console.log('Parsed planning info:', planningInfo); // Debug log

        setParsedInfo({ title, address, planningInfo, coordinates, itemId, landType });
      } catch (error) {
        console.error('Error parsing HTML content:', error);
        setParsedInfo(null);
      }
    }
  }, [htmlContent]);

  if (!parsedInfo) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Không thể phân tích HTML</h4>
          <p className="text-yellow-700 text-sm">
            Dữ liệu HTML không thể được phân tích tự động. Xem raw HTML bên dưới:
          </p>
        </div>
        <details className="bg-gray-50 p-4 rounded-lg border">
          <summary className="font-medium text-gray-700 cursor-pointer mb-2">
            Xem raw HTML (debug)
          </summary>
          <div className="bg-white p-3 rounded border">
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {htmlContent}
            </pre>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thông tin thửa đất */}
      {parsedInfo.title && (
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h4 className="font-semibold text-blue-800 mb-2">📍 Thông tin thửa đất</h4>
          <p className="text-blue-700 font-medium">{parsedInfo.title}</p>
          {parsedInfo.itemId && (
            <p className="text-sm text-blue-600 mt-1">ID: {parsedInfo.itemId}</p>
          )}
        </div>
      )}
      
      {/* Loại đất */}
      {parsedInfo.landType && (
        <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
          <h4 className="font-semibold text-orange-800 mb-2">🏷️ Thông tin loại đất</h4>
          <div className="space-y-1">
            <p className="text-orange-700"><span className="font-medium">Mã:</span> {parsedInfo.landType.id}</p>
            <p className="text-orange-700"><span className="font-medium">Diện tích:</span> {parsedInfo.landType.area}</p>
            <p className="text-orange-700"><span className="font-medium">Loại:</span> {parsedInfo.landType.description}</p>
          </div>
        </div>
      )}
      
      {/* Địa chỉ */}
      {parsedInfo.address && (
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
          <h4 className="font-semibold text-green-800 mb-2">📍 Địa chỉ</h4>
          <p className="text-green-700">{parsedInfo.address}</p>
        </div>
      )}
      
      {/* Tọa độ */}
      {parsedInfo.coordinates && (
        <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
          <h4 className="font-semibold text-purple-800 mb-2">🌐 Tọa độ</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-purple-700">Latitude:</span>
              <p className="text-purple-600 font-mono">{parsedInfo.coordinates.lat}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Longitude:</span>
              <p className="text-purple-600 font-mono">{parsedInfo.coordinates.lng}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Thông tin quy hoạch xây dựng */}
      {parsedInfo.planningInfo.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
          <h4 className="font-semibold text-gray-800 mb-3">🏗️ Thông tin quy hoạch xây dựng</h4>
          <div className="space-y-3">
            {parsedInfo.planningInfo.map((item, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-5 h-5 rounded mt-1 flex-shrink-0 border"
                    style={{ backgroundColor: item.color }}
                    title={`Màu: ${item.color}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-800 leading-tight">{item.type}</h5>
                      <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {item.area}
                      </span>
                    </div>
                    {item.details && (
                      <p className="text-sm text-gray-600 leading-relaxed">{item.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Lưu ý */}
      <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý quan trọng</h4>
        <p className="text-sm text-yellow-700 leading-relaxed">
          Dữ liệu này chỉ mang tính chất tham khảo. Vui lòng căn cứ theo màu sắc, ký hiệu đất trên từng loại bản đồ 
          và kiểm tra lại với cơ quan chức năng có thẩm quyền trước khi thực hiện các giao dịch bất động sản.
        </p>
      </div>      {/* Actions */}
      <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
        <h4 className="font-semibold text-gray-800 mb-3">🔧 Thao tác</h4>
        <div className="grid grid-cols-2 gap-3">
          {parsedInfo.coordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${parsedInfo.coordinates.lat},${parsedInfo.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <span>🗺️</span>
              <span>Mở Google Maps</span>
            </a>
          )}
          <button
            onClick={() => {
              if (parsedInfo.coordinates) {
                navigator.clipboard.writeText(`${parsedInfo.coordinates.lat}, ${parsedInfo.coordinates.lng}`);
                alert('Đã copy tọa độ vào clipboard!');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <span>📋</span>
            <span>Copy tọa độ</span>
          </button>
        </div>
      </div>
      
      {/* Thông tin gốc từ API */}
      <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
        <h4 className="font-semibold text-orange-800 mb-3">📜 Thông tin gốc từ API</h4>
        <div className="bg-white rounded-lg border p-4 max-h-96 overflow-y-auto">
          <div 
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
        <div className="mt-3 text-xs text-orange-700 bg-orange-100 p-2 rounded">
          <p>
            <strong>Lưu ý:</strong> Đây là nội dung HTML gốc từ API. Một số phần tử có thể không hiển thị đầy đủ do 
            thiếu CSS hoặc JavaScript từ trang web gốc.
          </p>
        </div>
      </div>
    </div>
  );
}

interface HanoiPlanningMapProps {
  height?: string;
  showControls?: boolean;
  className?: string;
}

export default function HanoiPlanningMap({ 
  height = '600px', 
  showControls = true,
  className = ''
}: HanoiPlanningMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [geoapifyApiKey, setGeoapifyApiKey] = useState<string | null>(null);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to call planning API
  const handleMapClick = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    setSelectedLocation([lat, lng]);

    console.log('Map clicked at:', lat, lng); // Debug log

    try {
      const response = await fetch('/api/guland-proxy/planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marker_lat: lat,
          marker_lng: lng,
          province_id: 1 // Default to Hà Nội (you can adjust this based on the click location)
        }),
      });

      const data: PlanningData = await response.json();
      console.log('Planning API response:', data); // Debug log
      setPlanningData(data);
      
      // Check if we have HTML data
      if (data?.data?.html) {
        console.log('HTML data found, length:', data.data.html.length); // Debug log
      } else {
        console.log('No HTML data in response'); // Debug log
      }
    } catch (err) {
      console.error('Planning API error:', err); // Debug log
      setError('Lỗi khi lấy thông tin quy hoạch: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    
    // Get Geoapify API key
    try {
      const apiKey = getGeoapifyApiKey();
      setGeoapifyApiKey(apiKey);
    } catch (error) {
      console.warn('Geoapify API key not found:', error);
    }
    
    // Fix for default markers in react-leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  if (!isClient) {
    return (
      <div className={`bg-gray-100 animate-pulse rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">Đang tải bản đồ...</p>
      </div>
    );
  }

  // Tọa độ trung tâm Hà Nội
  const center: [number, number] = [21.0285, 105.8542];
  
  // Một số điểm demo trên bản đồ Hà Nội
  const demoPoints = [
    {
      id: 1,
      name: "Hồ Hoàn Kiếm",
      position: [21.0285, 105.8542] as [number, number],
      description: "Trung tâm lịch sử của Hà Nội"
    },
    {
      id: 2,
      name: "Khu vực Cầu Giấy",
      position: [21.0337, 105.7981] as [number, number],
      description: "Khu đô thị mới, trung tâm công nghệ"
    },
    {
      id: 3,
      name: "Khu vực Thanh Xuân",
      position: [20.9876, 105.8125] as [number, number],
      description: "Khu dân cư đông đúc"
    }
  ];
  return (
    <div className={className}>
      {/* Map Container */}
      <div className="rounded-lg overflow-hidden relative" style={{ height }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={showControls}
        >
          <MapClickHandler onMapClick={handleMapClick} />
          
          {/* Base Map: Geoapify */}
          {geoapifyApiKey && (
            <TileLayer
              url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`}
              attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={15}
              opacity={1}
            />
          )}
          
          {/* Layer 1: Bản đồ quy hoạch Hà Nội 2030 (nền) */}
          <TileLayer
            url="https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png"
            attribution='&copy; Bản đồ quy hoạch Hà Nội 2030'
            maxZoom={15}
            opacity={0.7}
          />
          
          {/* Layer 2: Bản đồ đất đai Hà Nội (overlay) */}
          <TileLayer
            url="https://s3-hn-2.cloud.cmctelecom.vn/guland7/land/ha-noi/{z}/{x}/{y}.png"
            attribution='&copy; Bản đồ đất đai Hà Nội'
            maxZoom={15}
            opacity={0.5}
          />
          
          {/* Selected location marker */}
          {selectedLocation && (
            <Marker position={selectedLocation}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">Vị trí đã chọn</h3>
                  <p className="text-sm">
                    Tọa độ: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                  </p>
                  {isLoading && <p className="text-blue-600 text-sm">Đang tải thông tin quy hoạch...</p>}
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Planning polygon */}
          {planningData?.data?.points && planningData.data.points.length > 0 && (
            <Polygon
              positions={planningData.data.points.map(p => [p.lat, p.lng] as [number, number])}
              color="red"
              fillColor="red"
              fillOpacity={0.3}
              weight={2}
            >
              <Popup>
                <div className="p-2 max-w-sm">
                  <h3 className="font-semibold">Thông tin thửa đất</h3>
                  <p className="text-sm mb-2">{planningData.data.address}</p>
                  <div className="text-xs text-gray-600">
                    <p>ID: {planningData.data.id}</p>
                    <p>Tỉnh/TP: {planningData.data.province_id}</p>
                    <p>Quận/Huyện: {planningData.data.district_id}</p>
                    <p>Phường/Xã: {planningData.data.ward_id}</p>
                  </div>
                </div>
              </Popup>
            </Polygon>
          )}
            {/* Các marker demo */}
          {demoPoints.map((point) => (
            <Marker key={point.id} position={point.position}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-lg">{point.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{point.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Tọa độ: {point.position[0]}, {point.position[1]}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Instructions overlay */}
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border z-[1000] max-w-xs">
          <h4 className="font-semibold text-sm mb-1">💡 Hướng dẫn</h4>
          <p className="text-xs text-gray-600">
            Click vào bản đồ để xem thông tin quy hoạch chi tiết tại vị trí đó
          </p>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[1000]">
          <h4 className="font-semibold text-sm mb-2">Chú thích:</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>Geoapify Base Map</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded opacity-70"></div>
              <span>Quy hoạch Hà Nội 2030</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded opacity-50"></div>
              <span>Bản đồ đất đai</span>
            </div>
          </div>
        </div>

        {/* Status indicator for debugging */}
        {(selectedLocation || isLoading || planningData) && (
          <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow-lg border z-[1000] text-xs">
            <div className="space-y-1">
              {selectedLocation && (
                <div className="text-blue-600">
                  📍 Đã chọn: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                </div>
              )}
              {isLoading && <div className="text-yellow-600">⏳ Đang tải...</div>}
              {planningData && (
                <div className="text-green-600">
                  ✅ Có dữ liệu: {planningData.data?.html ? 'HTML có' : 'Không có HTML'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        
      {/* Planning Information Panel - Moved outside map container */}
      {planningData?.data?.html && (
        <div className="mt-6 bg-white rounded-xl shadow-lg border overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">📋 Thông tin quy hoạch chi tiết</h3>
                <p className="text-sm text-gray-600 mb-1">{planningData.data.address}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>🆔 ID: {planningData.data.id}</span>
                  <span>🏢 Tỉnh/TP: {planningData.data.province_id}</span>
                  <span>🏘️ Quận/Huyện: {planningData.data.district_id}</span>
                  <span>🏠 Phường/Xã: {planningData.data.ward_id}</span>
                </div>
              </div>
              <button
                onClick={() => setPlanningData(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Đóng thông tin"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6">
            <PlanningInfoDisplay htmlContent={planningData.data.html} />
          </div>
        </div>
      )}
        
      {/* Loading indicator */}
      {isLoading && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-400">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <div>
              <p className="text-blue-700 font-medium">Đang tải thông tin quy hoạch...</p>
              <p className="text-blue-600 text-sm">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-l-4 border-red-400">
          <div className="flex items-start">
            <div className="text-red-500 mr-3 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-red-700 font-medium">Lỗi khi tải thông tin</p>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
