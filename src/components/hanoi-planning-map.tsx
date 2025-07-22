'use client';

// Import React hooks first
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { getGeoapifyApiKey } from '@/lib/config';
import { latLngToTileXY, generatePlanningMapUrls, generatePlanningMapMosaicUrls } from '@/lib/utils';

// Import Leaflet only on client-side
let L: any;
let leafletImage: any;
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMapEvents: any, Polygon: any, ZoomControl: any, Rectangle: any;

// Import html-to-image only on client side
let toPng: any;

// Interface for search suggestions
interface SearchSuggestion {
  formatted: string;
  lat: number;
  lon: number;
  place_id: string;
  address_line1?: string;
  address_line2?: string;
  category?: string;
}

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
  geocodingData?: {
    success: boolean;
    data?: {
      status: number;
      data: string;
      need_update: boolean;
      province_id: string;
      district_id: string;
      ward_id: string;
      layer_2: string;
      name: string;
      road_id: string | null;
      max_native_zoom: number;
      url: string;
      district_new_alias: string | null;
      url_district: string;
      url_district_new: string;
      url_ward: string;
      url_road: string;
      url_map: string;
      html: string;
    };
    message?: string;
    status_code?: number;
  };
}

// Initialize Leaflet on client side only
if (typeof window !== 'undefined') {
  // Dynamic imports for client-side only
  L = require('leaflet');
  leafletImage = require('leaflet-image');
  const reactLeaflet = require('react-leaflet');
  MapContainer = reactLeaflet.MapContainer;
  TileLayer = reactLeaflet.TileLayer;
  Marker = reactLeaflet.Marker;
  Popup = reactLeaflet.Popup;
  useMapEvents = reactLeaflet.useMapEvents;
  Polygon = reactLeaflet.Polygon;
  ZoomControl = reactLeaflet.ZoomControl;
  Rectangle = reactLeaflet.Rectangle;
  
  // Import html-to-image
  const htmlToImage = require('html-to-image');
  toPng = htmlToImage.toPng;
  
  // Fix for default markers in react-leaflet
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
  
  // Khắc phục vấn đề cache bằng cách ghi đè phương thức TileLayer.getTileUrl
  const originalGetTileUrl = L.TileLayer.prototype.getTileUrl;
  L.TileLayer.prototype.getTileUrl = function(coords: any) {
    const url = originalGetTileUrl.call(this, coords);
    // Sử dụng proxy để tránh CORS error
    return `/api/map-tile-proxy?url=${encodeURIComponent(url.split('?')[0])}`;
  };
}

// Component for embedded address search
function MapAddressSearch({ 
  onLocationSelect 
}: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void 
}) {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebounce(searchValue, 750);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside and cleanup timeout
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup timeout on unmount
    };
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `/api/mapbox-search?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const suggestionsList: SearchSuggestion[] = data.features.map((feature: any) => ({
          formatted: feature.properties.place_formatted || feature.properties.name || '',
          lat: feature.properties.coordinates?.latitude || feature.geometry.coordinates[1] || 0,
          lon: feature.properties.coordinates?.longitude || feature.geometry.coordinates[0] || 0,
          place_id: feature.properties.mapbox_id || Math.random().toString(),
          address_line1: feature.properties.name || '',
          address_line2: feature.properties.place_formatted || '',
          category: feature.properties.feature_type || 'address',
        }));
        
        setSuggestions(suggestionsList);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchValue(suggestion.formatted);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    onLocationSelect(suggestion.lat, suggestion.lon, suggestion.formatted);
  };

  const clearSearch = () => {
    setSearchValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedSearchValue.trim().length > 1) {
      fetchSuggestions(debouncedSearchValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchValue]);

  return (
    <div className="relative w-80 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchValue.length > 1 && fetchSuggestions(searchValue)}
          placeholder="Tìm kiếm địa chỉ..."
          className="w-full px-8 py-2 pr-20 text-sm bg-white border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
        />
        
        {/* Loading indicator */}
        {isLoadingSuggestions && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Clear button */}
        {searchValue && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Xóa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Search icon */}
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-[2000] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {isLoadingSuggestions ? (
            <div className="p-3 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-1">Đang tìm kiếm...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.place_id || index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-3 py-2 text-left border-b last:border-b-0 text-sm transition-colors ${
                    index === selectedSuggestionIndex 
                      ? 'bg-blue-100 border-blue-200' 
                      : 'hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-gray-900">{suggestion.address_line1 || suggestion.formatted}</div>
                      {suggestion.address_line2 && (
                        <div className="truncate text-xs text-gray-500">{suggestion.address_line2}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-gray-500">
              Không tìm thấy kết quả phù hợp
            </div>
          )}
          
          {/* Keyboard navigation hint */}
          {suggestions.length > 0 && (
            <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 border-t">
              ↑↓ di chuyển • Enter chọn • Esc đóng
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Component for handling map clicks and events
function MapClickHandler({ 
  onMapClick, 
  onZoomChange,
  onMapReady
}: { 
  onMapClick: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
  onMapReady?: (map: any) => void;
}) {
  const map = useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    zoomend: (e: { target: { getZoom: () => number } }) => {
      if (onZoomChange) {
        onZoomChange(e.target.getZoom());
      }
    },
  });

  // Pass map instance to parent
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

// Component for planning info popup on map
function PlanningPopup({ 
  position, 
  planningData, 
  onClose,
  isLoading
}: {
  position: [number, number] | null;
  planningData: PlanningData | null;
  onClose: () => void;
  isLoading: boolean;
}) {
  const markerRef = useRef<L.Marker>(null);

  if (!position) return null;

  // Debug logs
  console.log('PlanningPopup render:', {
    position,
    isLoading,
    hasData: !!planningData?.data,
    hasHtml: !!planningData?.data?.html,
    htmlLength: planningData?.data?.html?.length || 0
  });

  // Auto-open popup when marker is created
  useEffect(() => {
    const timer = setTimeout(() => {
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }, 100); // Small delay to ensure marker is rendered
    
    return () => clearTimeout(timer);
  }, [position]);

  // Custom icon for planning marker
  const planningIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <Marker ref={markerRef} position={position} icon={planningIcon}>
      <Popup 
        minWidth={280}
        maxWidth={320}
        maxHeight={400}
        closeButton={true}
        autoClose={false}
        closeOnEscapeKey={true}
        className="planning-popup"
        autoPan={true}
        keepInView={true}
      >
        <div className="planning-popup-content">
          {isLoading ? (
            <div className="flex items-center p-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <p className="text-blue-700 text-sm">Đang tải...</p>
            </div>
          ) : planningData?.data ? (
            <div className="max-h-80 overflow-y-auto">
              {/* Compact header */}
              <div className="bg-blue-600 text-white p-3 -mx-3 -mt-3 mb-3">
                <h3 className="font-bold text-sm">📋 Thông tin quy hoạch</h3>
                <p className="text-xs opacity-90 truncate">{planningData.data.address}</p>
              </div>

              {/* Compact content */}
              <div className="space-y-3 px-1">
                {/* Raw HTML content - nhỏ gọn */}
                {planningData.data.html && (
                  <div 
                    className="text-xs planning-raw-html overflow-auto max-h-48"
                    dangerouslySetInnerHTML={{ __html: planningData.data.html }}
                  />
                )}

                {/* Compact action buttons */}
                <div className="flex gap-1 pt-2 border-t">
                  <button 
                    onClick={() => window.open(`https://maps.google.com/?q=${position[0]},${position[1]}`, '_blank')}
                    className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    🗺️ Maps
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${position[0]}, ${position[1]}`);
                    }}
                    className="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-gray-700 font-medium text-sm">Vị trí đã chọn</p>
              <p className="text-gray-600 text-xs">
                {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </p>
              {!planningData && (
                <p className="text-gray-500 text-xs mt-1">Chưa có dữ liệu quy hoạch</p>
              )}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// Component for creating planning information overlays
function PlanningOverlayManager({ 
  map, 
  showOverlay, 
  planningData,
  overlaysRef,
  onAreaClick
}: {
  map: any;
  showOverlay: boolean;
  planningData: PlanningData | null;
  overlaysRef: React.RefObject<L.DivOverlay[]>;
  onAreaClick: (area: any) => void;
}) {
  const [planningAreas, setPlanningAreas] = useState<Array<{
    lat: number;
    lng: number;
    info: string;
    type: string;
    color: string;
    detailInfo: {
      id: string;
      area: string;
      address: string;
      landType: string;
      planningType: string;
      restrictions: string[];
      buildingRatio: string;
    };
  }>>([]);

  // Listen to map events to update overlays
  useEffect(() => {
    if (!map || !showOverlay) {
      // Clear existing overlays
      if (overlaysRef.current) {
        overlaysRef.current.forEach(overlay => {
          if (map) {
            map.removeLayer(overlay);
          }
        });
        overlaysRef.current.length = 0;
      }
      setPlanningAreas([]);
      return;
    }

    const updatePlanningAreas = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Only show overlays at higher zoom levels to avoid clutter
      if (zoom < 15) {
        setPlanningAreas([]);
        return;
      }

      // Create sample planning overlays (you can replace this with real API calls)
      const sampleAreas = [
        { 
          lat: 21.0285, lng: 105.8542, info: "Khu vực lịch sử - Văn hóa", type: "Văn hóa", color: "#FFD700",
          detailInfo: {
            id: "T7-34",
            area: "281.2m²",
            address: "Phường Cát Linh, Quận Đống Đa, Hà Nội",
            landType: "ODT",
            planningType: "Đất nhóm nhà ở liền có (đất ở dân cư)",
            restrictions: ["Dự liệu tham khảo", "Vui lòng cân cứ theo mẫu", "Ký hiệu đất trên từng loại bản đồ"],
            buildingRatio: "Kiểm tra lại với cơ quan chức năng"
          }
        },
        { 
          lat: 21.0337, lng: 105.7981, info: "Khu đô thị mới", type: "Đô thị", color: "#32CD32",
          detailInfo: {
            id: "T8-45",
            area: "450.5m²",
            address: "Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội",
            landType: "DTS",
            planningType: "Đất thương mại dịch vụ",
            restrictions: ["Tuân thủ quy hoạch đô thị", "Chiều cao tối đa 25 tầng"],
            buildingRatio: "Hệ số sử dụng đất: 4.0"
          }
        },
        { 
          lat: 20.9876, lng: 105.8125, info: "Khu dân cư", type: "Nhà ở", color: "#87CEEB",
          detailInfo: {
            id: "T5-22",
            area: "180.0m²",
            address: "Phường Nhân Chính, Quận Thanh Xuân, Hà Nội",
            landType: "ODT",
            planningType: "Đất ở đô thị",
            restrictions: ["Xây dựng tối đa 4 tầng", "Mật độ xây dựng 60%"],
            buildingRatio: "Hệ số sử dụng đất: 2.4"
          }
        },
        { 
          lat: 21.0245, lng: 105.8412, info: "Khu thương mại", type: "Thương mại", color: "#FF6347",
          detailInfo: {
            id: "T9-67",
            area: "520.8m²",
            address: "Phường Láng Thượng, Quận Đống Đa, Hà Nội",
            landType: "TMDT",
            planningType: "Đất thương mại dịch vụ",
            restrictions: ["Kinh doanh thương mại", "Dịch vụ công cộng"],
            buildingRatio: "Hệ số sử dụng đất: 3.5"
          }
        },
        { 
          lat: 21.0156, lng: 105.8372, info: "Công viên - Cây xanh", type: "Cây xanh", color: "#228B22",
          detailInfo: {
            id: "T3-12",
            area: "1200.0m²",
            address: "Phường Láng Hạ, Quận Đống Đa, Hà Nội",
            landType: "CXL",
            planningType: "Đất cây xanh lâu dài",
            restrictions: ["Không được xây dựng", "Bảo tồn cây xanh"],
            buildingRatio: "Không áp dụng"
          }
        },
        { 
          lat: 21.0195, lng: 105.8502, info: "Khu công nghiệp", type: "Công nghiệp", color: "#8B4513",
          detailInfo: {
            id: "T6-38",
            area: "800.0m²",
            address: "Phường Phương Liên, Quận Đống Đa, Hà Nội",
            landType: "SKX",
            planningType: "Đất sản xuất kinh doanh",
            restrictions: ["Công nghiệp không ô nhiễm", "Tuân thủ PCCC"],
            buildingRatio: "Hệ số sử dụng đất: 3.0"
          }
        }
      ];

      // Filter areas within current bounds
      const visibleAreas = sampleAreas.filter(area => 
        bounds.contains([area.lat, area.lng])
      );

      setPlanningAreas(visibleAreas);
    };

    // Initial update
    updatePlanningAreas();

    // Listen to map events
    const events = ['zoomend', 'moveend'];
    events.forEach(event => {
      map.on(event, updatePlanningAreas);
    });

    return () => {
      events.forEach(event => {
        map.off(event, updatePlanningAreas);
      });
    };
  }, [map, showOverlay, overlaysRef]);

  // Create overlays
  useEffect(() => {
    if (!map || !showOverlay || planningAreas.length === 0) return;

    // Clear existing overlays
    if (overlaysRef.current) {
      overlaysRef.current.forEach(overlay => {
        map.removeLayer(overlay);
      });
    }

    const newOverlays: L.DivOverlay[] = [];

    planningAreas.forEach((area, index) => {
      // Create div element for overlay
      const overlayElement = L.DomUtil.create('div', 'planning-overlay');
      overlayElement.innerHTML = `
        <div style="
          background: ${area.color}; 
          color: white; 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-size: 11px; 
          font-weight: bold;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.3);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <div style="font-size: 10px; opacity: 0.9;">${area.type}</div>
          <div>${area.info}</div>
        </div>
      `;

      // Add click handler to overlay element
      overlayElement.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        onAreaClick(area);
      });

      // Create Leaflet DivOverlay (using Tooltip for simplicity)
      const overlay = L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'planning-text-overlay',
        opacity: 0.9
      })
        .setContent(overlayElement)
        .setLatLng([area.lat, area.lng]);

      map.addLayer(overlay);
      newOverlays.push(overlay);
    });

    if (overlaysRef.current) {
      overlaysRef.current.splice(0, overlaysRef.current.length, ...newOverlays);
    }

    return () => {
      newOverlays.forEach(overlay => {
        map.removeLayer(overlay);
      });
    };
  }, [map, showOverlay, planningAreas, overlaysRef]);

  return null;
}

// Component for compact planning info display
function PlanningInfoCompact({ 
  planningData, 
  selectedLocation,
  onLayerSwitch
}: {
  planningData: PlanningData;
  selectedLocation: [number, number] | null;
  onLayerSwitch?: (layerType: string, url: string, name: string) => void;
}) {
  const [parsedInfo, setParsedInfo] = useState<{
    title: string;
    address: string;
    planningInfo: Array<{ area: string; type: string; details: string; color: string }>;
    coordinates: { lat: number; lng: number } | null;
    itemId: string;
    landType: { id: string; area: string; description: string } | null;
  } | null>(null);

  useEffect(() => {
    if (planningData?.data?.html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(planningData.data.html, 'text/html');
        
        // Extract title
        const titleElement = doc.querySelector('.sqh-pin-inf__tle');
        const title = titleElement?.textContent?.trim() || '';
        
        // Extract address
        const addressElement = doc.querySelector('.sqh-pin-inf__adr');
        const address = addressElement?.textContent?.trim() || planningData?.data?.address || '';
        
        // Extract coordinates
        const latInput = doc.querySelector('input[name="lat"]') as HTMLInputElement;
        const lngInput = doc.querySelector('input[name="lng"]') as HTMLInputElement;
        const itemIdInput = doc.querySelector('input[name="item_id"]') as HTMLInputElement;
        
        const coordinates = latInput && lngInput ? {
          lat: parseFloat(latInput.value),
          lng: parseFloat(lngInput.value)
        } : null;
        const itemId = itemIdInput?.value || planningData?.data?.id?.toString() || '';
        
        // Extract land type info
        const typeInfoElement = doc.querySelector('.type-info');
        let landType = null;
        if (typeInfoElement) {
          const typeId = typeInfoElement.querySelector('.type-info__id')?.textContent?.trim() || '';
          const typeArea = typeInfoElement.querySelector('.type-info__sqr')?.textContent?.trim() || '';
          const typeDescription = typeInfoElement.querySelector('.type-info__txt')?.textContent?.trim() || '';
          landType = { id: typeId, area: typeArea, description: typeDescription };
        }
        
        // Extract planning info
        let planningInfo: Array<{ area: string; type: string; details: string; color: string }> = [];
        const textCols = Array.from(doc.querySelectorAll('.text-col'));
        if (textCols.length > 0) {
          planningInfo = textCols.map(col => {
            const areaElement = col.querySelector('.text-col__lbl');
            const area = areaElement?.textContent?.trim() || '';
            
            const typeElement = col.querySelector('.text-col__txt div[style*="background-color"]');
            const type = typeElement?.textContent?.trim() || '';
            
            const styleAttr = typeElement?.getAttribute('style') || '';
            const colorMatch = styleAttr.match(/background-color:\s*([^;]+)/);
            const color = colorMatch ? colorMatch[1].trim() : '#gray';
            
            const detailsElement = col.querySelector('.text-col__txt div:last-child');
            const details = detailsElement?.textContent?.trim() || '';
            
            return { area, type, details, color };
          }).filter(item => item.area && item.type);
        }

        setParsedInfo({ title, address, planningInfo, coordinates, itemId, landType });
      } catch (error) {
        console.error('Error parsing HTML content:', error);
        setParsedInfo(null);
      }
    }
  }, [planningData]);

  // Handle click events on geocoding control buttons
  useEffect(() => {
    if (!planningData?.geocodingData?.data?.html || !onLayerSwitch) return;

    const handleControlClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.btn--map-switch') as HTMLElement;
      
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        
        const layerType = button.getAttribute('data-type') || '';
        const url = button.getAttribute('data-url') || '';
        const name = button.getAttribute('data-name') || button.textContent || '';
        
        if (url && layerType) {
          onLayerSwitch(layerType, url, name);
          
          // Update active states
          const allButtons = document.querySelectorAll('.geocoding-controls .btn--map-switch');
          allButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
        }
      }
    };

    // Add click listeners to all map switch buttons
    const controlsContainer = document.querySelector('.geocoding-controls');
    if (controlsContainer) {
      controlsContainer.addEventListener('click', handleControlClick);
      
      return () => {
        controlsContainer.removeEventListener('click', handleControlClick);
      };
    }
  }, [planningData?.geocodingData?.data?.html, onLayerSwitch]);

  if (!parsedInfo && !planningData?.data) {
    return <div className="text-gray-500 text-sm">Không có dữ liệu</div>;
  }

  return (
    <div className="space-y-3">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">
            {parsedInfo?.title || `Thửa đất ID: ${planningData?.data?.id}`}
          </h4>
          <p className="text-xs text-gray-600 truncate">
            {parsedInfo?.address || planningData?.data?.address}
          </p>
        </div>
      </div>

      {/* Land type and coordinates */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-400">
          <div className="font-medium text-blue-800">Loại đất</div>
          <div className="text-blue-700">
            {parsedInfo?.landType?.id || 'N/A'}
          </div>
          <div className="text-blue-600 text-[10px]">
            {parsedInfo?.landType?.area || 'Chưa xác định'}
          </div>
        </div>
        <div className="bg-green-50 p-2 rounded border-l-2 border-green-400">
          <div className="font-medium text-green-800">Tọa độ</div>
          <div className="text-green-700 font-mono text-[10px]">
            {selectedLocation ? `${selectedLocation[0].toFixed(4)}, ${selectedLocation[1].toFixed(4)}` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Planning info */}
      {parsedInfo?.planningInfo && parsedInfo.planningInfo.length > 0 && (
        <div className="bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
          <div className="font-medium text-yellow-800 text-xs mb-2">Quy hoạch xây dựng</div>
          <div className="space-y-1">
            {parsedInfo.planningInfo.slice(0, 2).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">{item.type}</div>
                  <div className="text-[10px] text-gray-600">{item.area}</div>
                </div>
              </div>
            ))}
            {parsedInfo.planningInfo.length > 2 && (
              <div className="text-[10px] text-gray-500">
                +{parsedInfo.planningInfo.length - 2} loại khác
              </div>
            )}
          </div>
        </div>
      )}

      {/* Land type description */}
      {parsedInfo?.landType?.description && (
        <div className="bg-purple-50 p-2 rounded border-l-2 border-purple-400">
          <div className="font-medium text-purple-800 text-xs">Mô tả</div>
          <div className="text-purple-700 text-xs">{parsedInfo.landType.description}</div>
        </div>
      )}

      {/* Action buttons - smaller size */}
      <div className="grid grid-cols-3 gap-1 pt-1 border-t">
        <button 
          onClick={() => selectedLocation && window.open(`https://maps.google.com/?q=${selectedLocation[0]},${selectedLocation[1]}`, '_blank')}
          className="px-1 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-medium hover:bg-blue-200 transition-colors flex items-center justify-center"
        >
          🗺️
        </button>
        <button 
          onClick={() => {
            if (selectedLocation) {
              navigator.clipboard.writeText(`${selectedLocation[0]}, ${selectedLocation[1]}`);
              alert('Đã copy tọa độ!');
            }
          }}
          className="px-1 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium hover:bg-green-200 transition-colors flex items-center justify-center"
        >
          📋
        </button>
        <button 
          onClick={() => {
            const info = `
Thửa đất: ${parsedInfo?.title || planningData?.data?.id}
Địa chỉ: ${parsedInfo?.address || planningData?.data?.address}
Loại đất: ${parsedInfo?.landType?.id || 'N/A'}
Tọa độ: ${selectedLocation ? `${selectedLocation[0]}, ${selectedLocation[1]}` : 'N/A'}
            `.trim();
            navigator.clipboard.writeText(info);
            alert('Đã copy thông tin đầy đủ!');
          }}
          className="px-1 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-medium hover:bg-purple-200 transition-colors flex items-center justify-center"
        >
          📄
        </button>
      </div>

      {/* Map Layer Controls from Geocoding - Removed and moved to a separate component */}
      {/* {planningData?.geocodingData?.data?.html && (
        <div className="bg-orange-50 p-3 rounded border-l-2 border-orange-400">
          <div className="font-medium text-orange-800 text-xs mb-2">🗺️ Các loại bản đồ</div>
          <div 
            className="geocoding-controls text-xs"
            dangerouslySetInnerHTML={{ __html: planningData.geocodingData.data.html }}
          />
        </div>
      )} */}
    </div>
  );
}

/**
 * Component for displaying map types selector embedded at the bottom of the map
 */
function MapTypesSelector({ 
  geocodingHtml,
  onLayerSwitch 
}: {
  geocodingHtml?: string;
  onLayerSwitch?: (layerType: string, url: string, name: string) => void;
}) {
  // Handle click events on geocoding control buttons
  useEffect(() => {
    if (!geocodingHtml || !onLayerSwitch) return;

    const handleControlClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.btn--map-switch') as HTMLElement;
      
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        
        const layerType = button.getAttribute('data-type') || '';
        const url = button.getAttribute('data-url') || '';
        const name = button.getAttribute('data-name') || button.textContent || '';
        
        if (url && layerType) {
          onLayerSwitch(layerType, url, name);
          
          // Update active states
          const allButtons = document.querySelectorAll('.btn--map-switch');
          allButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
        }
      }
    };

    // Add click listeners after rendering the HTML content
    setTimeout(() => {
      const buttons = document.querySelectorAll('.btn--map-switch');
      buttons.forEach(button => {
        button.addEventListener('click', handleControlClick);
      });
    }, 100);
    
    return () => {
      const buttons = document.querySelectorAll('.btn--map-switch');
      buttons.forEach(button => {
        button.removeEventListener('click', handleControlClick);
      });
    };
  }, [geocodingHtml, onLayerSwitch]);

  // Return nothing - the HTML is already rendered in the parent component
  return null;
}

  // Component for handling map-service HTML with click events
function MapServiceDisplay({ 
  htmlContent, 
  onDetailLayerClick 
}: { 
  htmlContent: string;
  onDetailLayerClick: (layerId: string, layerName: string) => void;
}) {
  const [planningItems, setPlanningItems] = useState<Array<{
    id: string;
    name: string;
    url?: string;
  }>>([]);

  useEffect(() => {
    if (htmlContent) {
      try {
        // Parse HTML and extract planning items
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Find all detail-layer links
        const detailLayerLinks = doc.querySelectorAll('.detail-layer');
        
        const items = Array.from(detailLayerLinks).map(link => {
          const id = link.getAttribute('data-id') || '';
          const name = link.textContent?.trim() || '';
          const url = link.getAttribute('data-url-2030') || '';
          
          return { id, name, url };
        }).filter(item => item.id && item.name); // Only include items with both id and name
        
        setPlanningItems(items);
        console.log('Parsed planning items:', items);
      } catch (error) {
        console.error('Error parsing planning HTML:', error);
        setPlanningItems([]);
      }
    }
  }, [htmlContent]);

  const handleItemClick = (item: { id: string; name: string; url?: string }) => {
    console.log('🎯 Planning item clicked:', item);
    console.log('🚀 Calling onDetailLayerClick with:', item.id, item.name);
    onDetailLayerClick(item.id, item.name);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">🗺️ Danh sách quy hoạch</h4>
        <p className="text-sm text-gray-600">
          Click vào quy hoạch để xem trên bản đồ
        </p>
      </div>
      
      {/* Planning Items Grid */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {planningItems.length > 0 ? (
          planningItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              onClick={() => handleItemClick(item)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
                    {item.name}
                  </h5>
                  <p className="text-sm text-gray-500 mt-1">
                    ID: {item.id}
                  </p>
                </div>
                
                {/* Arrow Icon */}
                <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Không có dữ liệu quy hoạch</p>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      {planningItems.length > 0 && (
        <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
          Tổng cộng: {planningItems.length} quy hoạch
        </div>
      )}
    </div>
  );
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
        <h4 className="font-semibold text-orange-800 mb-3">📜 Thông tin dạng text</h4>
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

/**
 * Utility function to add a small random jitter to coordinates
 * This helps avoid cache issues with repeated API calls to the same coordinates
 */
const getJitteredCoordinates = (lat: number, lng: number, amount = 0.0000001) => {
  const jitteredLat = lat + (Math.random() * amount - amount/2);
  const jitteredLng = lng + (Math.random() * amount - amount/2);
  return { lat: jitteredLat, lng: jitteredLng };
};

/**
 * Generate random coordinates within the Hanoi area
 */
const getRandomHanoiCoordinates = () => {
  // Approximate bounding box for Hanoi
  const hanoiBounds = {
    minLat: 20.9500, // South
    maxLat: 21.0850, // North
    minLng: 105.7000, // West
    maxLng: 105.9000  // East
  };
  
  // Generate random coordinates within bounds
  const lat = hanoiBounds.minLat + (Math.random() * (hanoiBounds.maxLat - hanoiBounds.minLat));
  const lng = hanoiBounds.minLng + (Math.random() * (hanoiBounds.maxLng - hanoiBounds.minLng));
  
  return { lat, lng };
};

interface HanoiPlanningMapProps {
  height?: string;
  showControls?: boolean;
  className?: string;
  baseMapType?: 'geoapify' | 'google-satellite' | 'google-hybrid';
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  autoClickOnLoad?: boolean; // Tự động click để load thông tin quy hoạch
  showHanoiLandLayer?: boolean; // Hiển thị layer đất đai Hà Nội (chỉ dành cho khu vực Hà Nội)
  onAnalysisArea?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void; // Callback khi người dùng chọn vùng để phân tích
  mapFunctionsRef?: React.MutableRefObject<{
    capturePlanningMapImages?: (
      lat: number,
      lng: number,
      options?: {
        zoom?: number;
        useMosaic?: boolean;
        includeBaseMap?: boolean;
        captureLeaflet?: boolean;
        boundingBox?: {
          north: number;
          south: number;
          east: number;
          west: number;
        };
      }
    ) => Promise<any>;
  } | null>;
}

/**
 * Component hiển thị các nút chọn loại bản đồ
 */
function MapTypeButtons({ 
  onLayerSwitch 
}: { 
  onLayerSwitch: (layerType: string, url: string, name: string) => void 
}) {
  const [activeButton, setActiveButton] = useState<string>('QH 2030');
  
  // Danh sách các loại bản đồ
  const mapTypes = [
    { id: 'qh2030', name: 'QH 2030', layerType: 'layer_1', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png', color: '#7dd3fc' },
    { id: 'kh2025', name: 'KH 2025', layerType: 'layer_2022', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2022/{z}/{x}/{y}.png', color: '#a5b4fc' },
    { id: 'qh500', name: 'QH 1/500, 1/2000', layerType: 'layer_qhpk', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-qhpk/{z}/{x}/{y}.png', color: '#fca5a5' },
    { id: 'qhpk', name: 'QH phân khu', layerType: 'layer_qhpk_2', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-qhpk-2/{z}/{x}/{y}.png', color: '#fdba74' },
    { id: 'qhxd', name: 'QH xây dựng', layerType: 'layer_qhpk_qhxd', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-qhpk-qhxd/{z}/{x}/{y}.png', color: '#86efac' },
    { id: 'qhkhac', name: 'QH khác', layerType: 'layer_1', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png', color: '#d8b4fe' }
  ];
  
  const handleButtonClick = (mapType: typeof mapTypes[0]) => {
    setActiveButton(mapType.name);
    onLayerSwitch(mapType.layerType, mapType.url, mapType.name);
  };
  
  return (
    <div className="flex flex-wrap justify-center">
      {mapTypes.map((mapType) => (
        <button
          key={mapType.id}
          onClick={() => handleButtonClick(mapType)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors border-t border-l border-r rounded-t-md ${
            activeButton === mapType.name
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
          style={{
            backgroundColor: activeButton === mapType.name ? mapType.color : undefined,
            marginRight: '1px',
            marginBottom: '-1px',
            position: 'relative',
            zIndex: activeButton === mapType.name ? 5 : 1
          }}
        >
          {mapType.name}
        </button>
      ))}
    </div>
  );
}

// Add this new component for drawing bounding boxes
function BoundingBoxDrawer({
  enabled,
  onComplete,
}: {
  enabled: boolean;
  onComplete: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
}) {
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnBounds, setDrawnBounds] = useState<[[number, number], [number, number]] | null>(null);

  // Reset state when enabled changes
  useEffect(() => {
    if (!enabled) {
      setStartPoint(null);
      setCurrentPoint(null);
      setIsDrawing(false);
      setDrawnBounds(null);
    }
  }, [enabled]);

  const map = useMapEvents({
    mousedown: (e: { latlng: { lat: number; lng: number } }) => {
      if (!enabled) return;
      
      // Start drawing
      const { lat, lng } = e.latlng;
      setStartPoint([lat, lng]);
      setCurrentPoint([lat, lng]);
      setIsDrawing(true);
      setDrawnBounds(null);
    },
    mousemove: (e: { latlng: { lat: number; lng: number } }) => {
      if (!enabled || !isDrawing || !startPoint) return;
      
      // Update current point while dragging
      const { lat, lng } = e.latlng;
      setCurrentPoint([lat, lng]);
    },
    mouseup: (e: { latlng: { lat: number; lng: number } }) => {
      if (!enabled || !isDrawing || !startPoint || !currentPoint) return;
      
      // Complete drawing
      const { lat, lng } = e.latlng;
      setIsDrawing(false);
      
      const bounds = [
        [
          Math.min(startPoint[0], lat), 
          Math.min(startPoint[1], lng)
        ],
        [
          Math.max(startPoint[0], lat),
          Math.max(startPoint[1], lng)
        ]
      ] as [[number, number], [number, number]];
      
      setDrawnBounds(bounds);
      
      // Call onComplete with formatted bounds
      onComplete({
        north: bounds[1][0], // max lat
        south: bounds[0][0], // min lat
        east: bounds[1][1],  // max lng
        west: bounds[0][1]   // min lng
      });
    }
  });

  // Calculate current bounds during drawing
  const currentBounds = useMemo(() => {
    if (!startPoint || !currentPoint) return null;
    
    return [
      [
        Math.min(startPoint[0], currentPoint[0]), 
        Math.min(startPoint[1], currentPoint[1])
      ],
      [
        Math.max(startPoint[0], currentPoint[0]),
        Math.max(startPoint[1], currentPoint[1])
      ]
    ] as [[number, number], [number, number]];
  }, [startPoint, currentPoint]);

  // Return null to not render any visible rectangles
  return null;
}

export default function HanoiPlanningMap({ 
  height = '500px', 
  showControls = true, 
  className = '',
  baseMapType = 'google-hybrid',
  initialLat,
  initialLng,
  initialZoom,
  autoClickOnLoad = false,
  showHanoiLandLayer,
  onAnalysisArea,
  mapFunctionsRef
}: HanoiPlanningMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [geoapifyApiKey, setGeoapifyApiKey] = useState<string | null>(null);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(15);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [currentBaseMap, setCurrentBaseMap] = useState<'geoapify' | 'google-satellite' | 'google-hybrid'>(baseMapType);
  const [baseMapOpacity, setBaseMapOpacity] = useState(0.6);
  const [layer1Opacity, setLayer1Opacity] = useState(0.8);
  const [layer2Opacity, setLayer2Opacity] = useState(0.6);
  const [showBaseMap, setShowBaseMap] = useState(true);
  const [showLayer1, setShowLayer1] = useState(true);
  const [showLayer2, setShowLayer2] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showPlanningOverlay, setShowPlanningOverlay] = useState(false);
  const [activeMapType, setActiveMapType] = useState<string>('QH 2030');
  const planningOverlaysRef = useRef<L.DivOverlay[]>([]);
  const [selectedPlanningArea, setSelectedPlanningArea] = useState<any>(null);
  const [isPlanningPanelMinimized, setIsPlanningPanelMinimized] = useState(false);
  const [layer1Url, setLayer1Url] = useState('https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png');
  const [layer1Name, setLayer1Name] = useState('quy hoạch2030');
  const [geocodingData, setGeocodingData] = useState<any>(null);
  const geocodingFetched = useRef(false);
  const [isDrawingBoundingBox, setIsDrawingBoundingBox] = useState(false);
  const [analysisAreaBounds, setAnalysisAreaBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Load Leaflet CSS dynamically on client-side
  useEffect(() => {
    setIsClient(true);
    
    // Dynamically load Leaflet CSS
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, []);

  // Capture planning map images function - defined inside the component
  const capturePlanningMapImages = useCallback(async (
    lat: number, 
    lng: number, 
    options: {
      zoom?: number;
      useMosaic?: boolean;
      includeBaseMap?: boolean;
      captureLeaflet?: boolean;
      boundingBox?: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
    } = {}
  ) => {
    if (!mapInstance) {
      console.error('Map instance not available');
      return null;
    }
    
    const safeZoom = options.zoom || 18;
    const useMosaic = options.useMosaic ?? true;
    const includeBaseMap = options.includeBaseMap ?? true;
    const boundingBox = options.boundingBox;
    
    try {
      console.log(`📷 Capturing map at coordinates ${lat}, ${lng} with zoom ${safeZoom}`);
      
      // Remember current map state to restore later
      const originalCenter = mapInstance.getCenter();
      const originalZoom = mapInstance.getZoom();
      const originalBaseMapOpacity = baseMapOpacity;
      const originalLayer1Opacity = layer1Opacity;
      
      // Use a temporary marker or bounding box
      let tempMarker: any = null;
      let rectangle: any = null;

      // Handle bounding box if provided, otherwise use point
      if (boundingBox) {
        // Use the provided bounding box
        const bounds = [
          [boundingBox.south, boundingBox.west],
          [boundingBox.north, boundingBox.east]
        ] as [[number, number], [number, number]];

        // Fit map to these bounds
        mapInstance.fitBounds(bounds);
        
        // We're not adding any visible rectangle
        // Just store the bounds for calculations
        
        // Calculate center for metadata
        lat = (boundingBox.north + boundingBox.south) / 2;
        lng = (boundingBox.east + boundingBox.west) / 2;
      } else {
        // Single point mode
        mapInstance.setView([lat, lng], safeZoom);
        
        // Don't add any marker or rectangle - keep the map clean
      }
      
      // Prepare for the screenshot
      if (!includeBaseMap) {
        // Set base layer opacity to 0 temporarily
        setBaseMapOpacity(0);
      }
      
      // Adjust layer opacity to ensure it's visible
      setLayer1Opacity(1.0);
      
      // Wait for layers to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let result: any = null;
      
      // Use leaflet-image to capture if requested
      if (options.captureLeaflet && typeof window !== 'undefined' && leafletImage) {
        console.log('📸 Using leaflet-image for capture...');
        
        try {
          const imageDataUrl = await new Promise<string>((resolve, reject) => {
            leafletImage(mapInstance, (err: any, canvas: HTMLCanvasElement) => {
              if (err) {
                console.error('leaflet-image error:', err);
                reject(err);
                return;
              }
              
              try {
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
              } catch (canvasErr) {
                console.error('Canvas conversion error:', canvasErr);
                reject(canvasErr);
              }
            });
          });
          
          result = { 
            imageDataUrl,
            lat, 
            lng
          };
          
          console.log('📸 Leaflet image captured:', { width: 'N/A', height: 'N/A' });
        } catch (leafletErr) {
          console.error('📸 Leaflet image capture failed:', leafletErr);
          // Will fall back to other methods
        }
      }
      
      // If leaflet-image failed or wasn't requested, use html-to-image
      if (!result && typeof window !== 'undefined' && toPng) {
        try {
          console.log('📸 Using html-to-image for capture...');
          
          // Find the map container
          const mapContainer = document.querySelector('.map-container');
          if (mapContainer) {
            const imageDataUrl = await toPng(mapContainer as HTMLElement);
            
            result = {
              imageDataUrl,
              lat,
              lng
            };
            
            console.log('📸 HTML capture completed');
          } else {
            console.error('Map container not found');
          }
        } catch (htmlToImageErr) {
          console.error('📸 HTML-to-image capture failed:', htmlToImageErr);
        }
      }
      
      // If all capture methods failed or are unavailable, get tile URLs
      if (!result) {
        console.log('📸 Capture failed or unavailable. Returning tile URLs...');
        
        if (useMosaic) {
          const urls = generatePlanningMapMosaicUrls(lat, lng, safeZoom);
          result = { ...urls, lat, lng };
        } else {
          const urls = generatePlanningMapUrls(lat, lng, safeZoom);
          result = { ...urls, lat, lng };
        }
      }
      
      // Clean up and restore original settings
      if (tempMarker) {
        mapInstance.removeLayer(tempMarker);
      }
      if (rectangle) {
        mapInstance.removeLayer(rectangle);
      }
      
      // Restore original map state
      mapInstance.setView([originalCenter.lat, originalCenter.lng], originalZoom);
      setBaseMapOpacity(originalBaseMapOpacity);
      setLayer1Opacity(originalLayer1Opacity);
      
      return result;
    } catch (error) {
      console.error('Error capturing map:', error);
      return null;
    }
  }, [mapInstance, baseMapOpacity, layer1Opacity, setBaseMapOpacity, setLayer1Opacity]);

  // Update mapFunctionsRef with capture function
  useEffect(() => {
    if (mapFunctionsRef) {
      mapFunctionsRef.current = {
        ...mapFunctionsRef?.current,
        capturePlanningMapImages
      };
    }
    
    // Also update global mapFunctions for use in planning-utils.ts
    if (typeof window !== 'undefined') {
      (window as any).mapFunctions = {
        capturePlanningMapImages
      };
      console.log('✅ Map functions registered globally');
    }
  }, [capturePlanningMapImages, mapFunctionsRef]);

  // Handler for bounding box completion
  const handleBoundingBoxComplete = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    console.log('Bounding box drawn:', bounds);
    setAnalysisAreaBounds(bounds);
    
    // Call the callback if provided
    if (onAnalysisArea) {
      onAnalysisArea(bounds);
    }
    
    // Exit drawing mode after completion
    setIsDrawingBoundingBox(false);
  };

  // Add this for screenshot capturing
  const captureAreaScreenshot = async () => {
    if (!mapInstance || !analysisAreaBounds) return;
    
    try {
      setIsLoading(true);
      // Use the enhanced capturePlanningMapImages function with boundingBox option
      const result = await capturePlanningMapImages(0, 0, {
        zoom: currentZoom,
        useMosaic: false, 
        includeBaseMap: true,
        captureLeaflet: true,
        boundingBox: analysisAreaBounds
      });

      if (result && result.imageDataUrl) {
        // You can use the result.imageDataUrl here
        // For example, open in a new window or save it
        console.log('✅ Area screenshot captured successfully');
        
        // Create a simple preview window
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html>
              <head><title>Planning Map Screenshot</title></head>
              <body style="margin:0;padding:20px;text-align:center;background:#f8f9fa;">
                <h3>Planning Map Screenshot</h3>
                <div>
                  <img src="${result.imageDataUrl}" 
                       style="max-width:100%;border:1px solid #ddd;box-shadow:0 2px 10px rgba(0,0,0,0.1);" />
                </div>
                <p style="margin-top:15px;">
                  <a href="${result.imageDataUrl}" download="planning-map-${Date.now()}.png" 
                     style="padding:10px 15px;background:#4285f4;color:white;text-decoration:none;border-radius:4px;">
                     Download Image
                  </a>
                </p>
              </body>
            </html>
          `);
          win.document.close();
        }
        
        return result.imageDataUrl;
      } else {
        console.error('No image data URL in result');
        return null;
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Add new state for special modal handling
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [specialModalData, setSpecialModalData] = useState<{
    type: 'qhxd' | 'qhkhac';
    name: string;
    htmlContent: string;
  } | null>(null);
  const [isLoadingMapService, setIsLoadingMapService] = useState(false);
  
  // State to track when map types are being updated
  const [isUpdatingMapTypes, setIsUpdatingMapTypes] = useState(false);

  // State to store current map-service data for clicked location
  const [currentMapServiceData, setCurrentMapServiceData] = useState<string | null>(null);

  // Function to detect if coordinates are in Hanoi area
  const isInHanoi = (lat: number, lng: number): boolean => {
    // Hanoi boundaries (approximate)
    // Lat: 20.8 - 21.4 (North-South)
    // Lng: 105.3 - 106.0 (East-West)
    return lat >= 20.8 && lat <= 21.4 && lng >= 105.3 && lng <= 106.0;
  };

  // Tọa độ trung tâm (có thể override bằng props)
  const center: [number, number] = [
    initialLat || 21.0285, 
    initialLng || 105.8542
  ];

  // Auto-detect if we should show Hanoi land layer based on coordinates
  const shouldShowHanoiLandLayer = showHanoiLandLayer !== undefined 
    ? showHanoiLandLayer 
    : (initialLat && initialLng ? isInHanoi(initialLat, initialLng) : true);

  // Predefined map types for consistent usage
  const defaultMapTypes = [
    { id: 'qh2030', name: 'QH 2030', layerType: 'layer_1', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png', color: '#7dd3fc' },
    // { id: 'kh2025', name: 'KH 2025', layerType: 'layer_2022', url: 'https://s3-hn-2.cloud.cmctelecom.vn/guland9/qh-2025/ha-noi/quan-ha-dong/{z}/{x}/{y}.png', color: '#a5b4fc' },
    { id: 'qh500', name: 'QH 1/500, 1/2000', layerType: 'layer_qhpk', url: 'https://s3-han02.fptcloud.com/guland/hn-qhxd-2/{z}/{x}/{y}.png', color: '#fca5a5' },
    { id: 'qhpk', name: 'QH phân khu', layerType: 'layer_qhpk_2', url: 'https://s3-hn-2.cloud.cmctelecom.vn/guland4/hanoi-qhpk2/{z}/{x}/{y}.png', color: '#fdba74' },
    // { id: 'qhxd', name: 'QH xây dựng', layerType: 'layer_qhpk_qhxd', url: 'https://s3-hn-2.cloud.cmctelecom.vn/guland4/hanoi-qhpk2/{z}/{x}/{y}.png', color: '#86efac' },
    { id: 'qhkhac', name: 'QH khác', layerType: 'layer_1', url: 'https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png', color: '#d8b4fe' }
  ];

  // State for current map types with updated URLs
  const [currentMapTypes, setCurrentMapTypes] = useState(defaultMapTypes);
  
  // Safety check to ensure currentMapTypes is always an array
  const safeCurrentMapTypes = Array.isArray(currentMapTypes) ? currentMapTypes : defaultMapTypes;

  // Function to call map-service API (used for fallback only)
  const fetchMapServiceData = async (lat: number, lng: number) => {
    try {
      console.log('🌐 Fetching map service data for coordinates:', lat, lng);
      const response = await fetch(`/api/map-service?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      console.log('📦 Map service response:', data);
      
      if (data.success && data.data?.data) {
        console.log('✅ Map service data received, length:', data.data.data.length);
        return data.data.data; // HTML content
      }
      console.warn('⚠️ No valid map service data received');
      return null;
    } catch (error) {
      console.error('❌ Error fetching map service data:', error);
      return null;
    }
  };

  // Function to call detail-layer API
  const fetchDetailLayerData = async (layerId: string) => {
    try {
      const response = await fetch(`/api/map-service/detail-layer?id=${layerId}`);
      const data = await response.json();
      
      if (data.success && data.data?.data) {
        return data.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching detail layer data:', error);
      return null;
    }
  };

  // Function to extract tile URLs from HTML content
  const extractTileUrlsFromHtml = (htmlContent: string) => {
    if (!htmlContent) return {};
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const urlMap: { [key: string]: string } = {};
      
      // Extract QH 2030 URL
      const qh2030Button = doc.querySelector('#btn-2030, .btn--map-switch[data-type="layer_1"]');
      if (qh2030Button) {
        const url = qh2030Button.getAttribute('data-url');
        if (url && url.includes('{z}/{x}/{y}')) {
          urlMap['qh2030'] = url;
        }
      }
      
      // Extract KH 2025 URL
      const kh2025Button = doc.querySelector('.btn--map-switch[data-type="layer_2022"]');
      if (kh2025Button) {
        const url = kh2025Button.getAttribute('data-url');
        if (url && url.includes('{z}/{x}/{y}')) {
          urlMap['kh2025'] = url;
        }
      }
      
      // Extract QH 1/500, 1/2000 URL
      const qh500Buttons = doc.querySelectorAll('.btn--map-switch[data-type="layer_qhpk_2"], .btn--map-switch[data-type="layer_qhpk"]');
      qh500Buttons.forEach(button => {
        const text = button.textContent?.trim() || '';
        const url = button.getAttribute('data-url');
        if (text.includes('1/500') && url && url.includes('{z}/{x}/{y}')) {
          urlMap['qh500'] = url;
        }
      });
      
      // Extract QH phân khu URL
      const qhpkButtons = doc.querySelectorAll('.btn--map-switch[data-type="layer_qhpk_2"]');
      qhpkButtons.forEach(button => {
        const text = button.textContent?.trim() || '';
        const url = button.getAttribute('data-url');
        if (text.includes('phân khu') && url && url.includes('{z}/{x}/{y}')) {
          urlMap['qhpk'] = url;
        }
      });
      
      // Extract QH xây dựng URL  
      const qhxdButton = doc.querySelector('.btn-qhxd, .btn--map-switch[class*="qhxd"]');
      if (qhxdButton) {
        const url = qhxdButton.getAttribute('data-url');
        if (url && url.includes('{z}/{x}/{y}')) {
          urlMap['qhxd'] = url;
        }
      }
      
      console.log('🔍 Extracted tile URLs from HTML:', urlMap);
      return urlMap;
    } catch (error) {
      console.error('Error extracting URLs from HTML:', error);
      return {};
    }
  };

  // Function to update URLs based on geocoding data for location
  const updateMapTypeUrls = (geocodingData: any) => {
    if (!geocodingData?.data?.html) return defaultMapTypes;
    
    // Extract tile URLs from HTML content
    const extractedUrls = extractTileUrlsFromHtml(geocodingData.data.html);
    
    // Only update if we actually found some valid URLs
    const hasValidUrls = Object.keys(extractedUrls).length > 0;
    if (!hasValidUrls) {
      console.log('⚠️ No valid tile URLs found in geocoding response, keeping defaults');
      return defaultMapTypes;
    }
    
    console.log('✅ Updating map types with extracted URLs:', extractedUrls);
    
    return defaultMapTypes.map(mapType => {
      // Use extracted URL if available, otherwise keep default
      const newUrl = extractedUrls[mapType.id] || mapType.url;
      
      return {
        ...mapType,
        url: newUrl
      };
    });
  };

  // Set default layer to QH 2030 on first render
  useEffect(() => {
    if (isClient && !geocodingFetched.current) {
      // Use the first map type (QH 2030) as default
      setLayer1Url(defaultMapTypes[0].url);
      setLayer1Name(defaultMapTypes[0].name);
      setActiveMapType(defaultMapTypes[0].name);
    }
  }, [isClient]);

  // Auto click on map if autoClickOnLoad is true and we have initial coordinates
  useEffect(() => {
    if (isClient && autoClickOnLoad && initialLat && initialLng && mapInstance && !selectedLocation) {
      const timer = setTimeout(() => {
        console.log('🎯 Auto-clicking map at initial coordinates:', initialLat, initialLng);
        handleMapClick(initialLat, initialLng);
      }, 2000); // Wait 2 seconds for map to fully load
      
      return () => clearTimeout(timer);
    }
  }, [isClient, autoClickOnLoad, initialLat, initialLng, mapInstance, selectedLocation]);
  
  // Update mapFunctionsRef with capture function
  useEffect(() => {
    if (mapInstance) {
      // Update both the ref and the global window.mapFunctions
      const mapFunctions = {
        capturePlanningMapImages: (lat: number, lng: number, options = {}) => 
          capturePlanningMapImages(lat, lng, options)
      };
      
      // Update the ref if provided
      if (mapFunctionsRef) {
        mapFunctionsRef.current = mapFunctions;
      }
      
      // Always update the global variable for use in planning-utils.ts
      if (typeof window !== 'undefined') {
        (window as any).mapFunctions = mapFunctions;
        console.log('✅ Map functions registered globally');
      }
    }
  }, [mapInstance, mapFunctionsRef]);

  // Fetch geocoding data once when component mounts
  useEffect(() => {
    // Skip if already fetched or not client-side
    if (!isClient || geocodingFetched.current) return;
    
    const fetchGeocodingData = async () => {
      try {
        console.log('🌍 Fetching initial geocoding data...');
        
        // Slightly randomize coordinates to avoid cache issues
        const jittered = getJitteredCoordinates(
          21.0277644, // Base lat for Hanoi
          105.8341598, // Base lng for Hanoi
          0.0000001 // Very small jitter to avoid cache
        );
        
        const response = await fetch('/api/guland-proxy/geocoding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: jittered.lat,
            lng: jittered.lng,
            path: "soi-quy-hoach"
          }),
        });
        
        const data = await response.json();
        console.log('🌐 Geocoding response:', data);
        
        if (data?.success && data?.data) {
          setGeocodingData(data);
          
          // Extract map layer URLs from the HTML content if available
          if (data.data?.html) {
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(data.data.html, 'text/html');
              
              // Find the QH 2030 button (or first map type button)
              const defaultButton = doc.querySelector('#btn-2030') || 
                                   doc.querySelector('.btn--map-switch[data-type="layer_1"]');
                
              if (defaultButton) {
                const url = defaultButton.getAttribute('data-url');
                const name = defaultButton.getAttribute('data-name') || defaultButton.textContent?.trim() || 'QH 2030';
                
                if (url) {
                  console.log(`🗺️ Found default layer URL from API: ${url}`);
                  setLayer1Url(url);
                  setLayer1Name(name);
                  setActiveMapType(name);
                }
              }
            } catch (parseError) {
              console.error('Error parsing HTML content:', parseError);
            }
          }
          // Default to first mapType if couldn't extract from HTML
          else if (data.data?.url) {
            setLayer1Url(data.data.url);
            setLayer1Name(data.data.name || 'Quy hoạch Hà   Nội');
          }
        }
        
        // Mark as fetched so we don't fetch again
        geocodingFetched.current = true;
      } catch (error) {
        console.error('❌ Error fetching geocoding data:', error);
      }
    };
    
    fetchGeocodingData();
  }, [isClient]);

  // Helper function to update map type URLs based on geocoding data
  const updateMapTypesFromGeocodingData = useCallback((newGeocodingData: any, source: string = '') => {
    const dataToUse = newGeocodingData?.success ? newGeocodingData : geocodingData;
    if (dataToUse?.data?.html) {
      const updatedMapTypes = updateMapTypeUrls(dataToUse);
      
      // Only update state if the URLs actually changed
      const urlsChanged = updatedMapTypes.some((newType: any, index: number) => {
        const currentType = safeCurrentMapTypes[index];
        return currentType && newType.url !== currentType.url;
      });
      
      if (urlsChanged) {
        console.log(`🔄 ${source}: Map type URLs changed, updating state:`, updatedMapTypes);
        setIsUpdatingMapTypes(true);
        setCurrentMapTypes(updatedMapTypes);
        
        // Update the current active layer if it exists
        const currentMapType = updatedMapTypes.find((mt: any) => mt.name === activeMapType);
        if (currentMapType && currentMapType.url !== layer1Url) {
          console.log(`🗺️ ${source}: Updating active layer "${activeMapType}" with new URL:`, currentMapType.url);
          setLayer1Url(currentMapType.url);
          setLayer1Name(currentMapType.name);
          
          // Force update of map type buttons by triggering re-render
          setTimeout(() => {
            console.log(`🔄 ${source}: Map type buttons should now reflect new URLs`);
            setIsUpdatingMapTypes(false);
          }, 100);
        } else {
          setIsUpdatingMapTypes(false);
        }
      } else {
        console.log(`✅ ${source}: Map type URLs unchanged, keeping current state`);
        setIsUpdatingMapTypes(false);
      }
    } else {
      setIsUpdatingMapTypes(false);
    }
  }, [geocodingData, activeMapType, layer1Url, safeCurrentMapTypes]);

  // Function to handle search location selection
  const handleSearchLocationSelect = useCallback(async (lat: number, lng: number, address: string) => {
    console.log('🔍 Search location selected:', lat, lng, address);
    
    // Pan map to selected location
    if (mapInstance) {
      mapInstance.setView([lat, lng], Math.max(currentZoom, 16), { animate: true });
    }
    
    // Trigger planning API call for this location
    // Call the same logic as handleMapClick
    setPlanningData(null);
    setError(null);
    setCurrentMapServiceData(null);
    
    setIsLoading(true);
    setSelectedLocation([lat, lng]);

    console.log('🎯 Search triggered map click at:', lat, lng);

    try {
      const [geocodingResponse, planningResponse, mapServiceResponse] = await Promise.all([
        fetch('/api/guland-proxy/geocoding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, path: "soi-quy-hoach" }),
        }),
        fetch('/api/guland-proxy/planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marker_lat: lat, marker_lng: lng, province_id: 1 }),
        }),
        fetch(`/api/map-service?lat=${lat}&lng=${lng}`)
      ]);

      const newGeocodingData = await geocodingResponse.json();
      const planningData: PlanningData = await planningResponse.json();
      const mapServiceData = await mapServiceResponse.json();

      if (newGeocodingData?.success) {
        setGeocodingData(newGeocodingData);
      }

      setPlanningData({
        ...planningData,
        geocodingData: newGeocodingData?.success ? newGeocodingData : geocodingData
      });

      if (mapServiceData?.success && mapServiceData?.data?.data) {
        setCurrentMapServiceData(mapServiceData.data.data);
      } else {
        console.warn('⚠️ No valid map service data received from search');
        setCurrentMapServiceData(null);
      }

      // Update all map type URLs based on new location data
      updateMapTypesFromGeocodingData(newGeocodingData, 'Search');
      
    } catch (err) {
      console.error('❌ Search API error:', err);
      setError('Lỗi khi lấy thông tin quy hoạch: ' + (err as Error).message);
      setPlanningData(null);
      setCurrentMapServiceData(null);
    } finally {
      setIsLoading(false);
    }
  }, [mapInstance, currentZoom, updateMapTypesFromGeocodingData]);

  // Function to call planning API
  const handleMapClick = async (lat: number, lng: number) => {
    // Clear previous data first
    setPlanningData(null);
    setError(null);
    setCurrentMapServiceData(null);
    
    setIsLoading(true);
    setSelectedLocation([lat, lng]);

    console.log('🎯 Map clicked at:', lat, lng); // Debug log

    try {
      // Fetch multiple APIs in parallel for better performance
      const [geocodingResponse, planningResponse, mapServiceResponse] = await Promise.all([
        // 1. Fetch geocoding data
        fetch('/api/guland-proxy/geocoding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, path: "soi-quy-hoach" }),
        }),
        
        // 2. Fetch planning data  
        fetch('/api/guland-proxy/planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marker_lat: lat, marker_lng: lng, province_id: 1 }),
        }),
        
        // 3. Fetch map-service data for "QH khác"
        fetch(`/api/map-service?lat=${lat}&lng=${lng}`)
      ]);

      // Process geocoding response
      const newGeocodingData = await geocodingResponse.json();
      console.log('🌐 New geocoding response:', newGeocodingData);
      
      if (newGeocodingData?.success) {
        setGeocodingData(newGeocodingData);
      }

      // Process planning response
      const planningData: PlanningData = await planningResponse.json();
      console.log('📋 Planning API response:', planningData);
      
      // Combine with NEW geocoding data
      setPlanningData({
        ...planningData,
        geocodingData: newGeocodingData?.success ? newGeocodingData : geocodingData
      });

      // Process map-service response
      const mapServiceData = await mapServiceResponse.json();
      console.log('🗺️ Map service response:', mapServiceData);
      
      if (mapServiceData?.success && mapServiceData?.data?.data) {
        console.log('✅ Map service data updated for QH khác, length:', mapServiceData.data.data.length);
        setCurrentMapServiceData(mapServiceData.data.data);
      } else {
        console.warn('⚠️ No valid map service data received');
        setCurrentMapServiceData(null);
      }

      // Update all map type URLs based on new location data
      updateMapTypesFromGeocodingData(newGeocodingData, 'Map Click');
      
      // Check if we have HTML data
      if (planningData?.data?.html) {
        console.log('📄 Planning HTML data found, length:', planningData.data.html.length);
      } else {
        console.log('📄 No planning HTML data in response');
      }
    } catch (err) {
      console.error('❌ API error:', err);
      setError('Lỗi khi lấy thông tin quy hoạch: ' + (err as Error).message);
      setPlanningData(null);
      setCurrentMapServiceData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Unified function to handle detail layer loading
  const handleDetailLayerLoad = async (layerId: string, layerName: string) => {
    console.log('🔄 Loading detail layer:', layerId, layerName);
    try {
      setIsLoadingMapService(true); // Show loading state
      const layerData = await fetchDetailLayerData(layerId);
      console.log('📦 Layer data received:', layerData);
      
      if (layerData?.url) {
        // Load new tile layer on map
        console.log('🗺️ Setting new layer URL:', layerData.url);
        setLayer1Url(layerData.url);
        setLayer1Name(layerData.name || layerName);
        setActiveMapType(layerData.name || layerName);
        
        // Make sure layer is visible
        setShowLayer1(true);
        
        // Close modal after successful load
        setShowSpecialModal(false);
        
        // Force re-render by updating state
        setTimeout(() => {
          console.log(`✅ Successfully loaded detail layer: ${layerData.name || layerName}`);
          console.log(`📍 Active map type: ${layerData.name || layerName}`);
          console.log(`🌐 Layer URL: ${layerData.url}`);
        }, 100);
        
        return true;
      } else {
        console.error('❌ No URL found in layer data for ID:', layerId);
        console.error('❌ Full layer data:', layerData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading detail layer:', error);
      return false;
    } finally {
      setIsLoadingMapService(false); // Hide loading state
    }
  };

  // Function to handle layer switching from geocoding controls
  const handleLayerSwitch = async (layerType: string, url: string, name: string) => {
    console.log('🔄 Switching layer:', { layerType, url, name });
    
    // Check if this is a special case for qhxd or qhkhac
    // Check by both layerType and name to be more accurate
    const mapTypeData = safeCurrentMapTypes.find((mt: any) => 
      mt.layerType === layerType || 
      mt.id === layerType ||
      mt.name === name ||
      (name.includes('QH xây dựng') && mt.id === 'qhxd') ||
      (name.includes('QH khác') && mt.id === 'qhkhac')
    );
    
    // Also check directly if the name/type indicates special handling
    const isQhxd = name.includes('QH xây dựng') || name.includes('xây dựng') || layerType === 'layer_qhpk_qhxd';
    const isQhkhac = name.includes('QH khác') || name.includes('khác') || 
                     (layerType === 'layer_khac') ||
                     (layerType === 'layer_1' && name.includes('khác'));
    
    // Don't treat "QH 2030" as "QH khác" even though both use layer_1
    const isQh2030 = name.includes('QH 2030') || name.includes('2030');
    
    console.log('🔍 Layer switch debug:', {
      layerType,
      name,
      isQhxd,
      isQhkhac,
      isQh2030,
      mapTypeData: mapTypeData ? mapTypeData.id : 'not found',
      hasSelectedLocation: !!selectedLocation,
      hasMapInstance: !!mapInstance
    });
    
    // Handle special cases for QH khác and QH xây dựng
    if ((isQhkhac && !isQh2030) || (mapTypeData && mapTypeData.id === 'qhkhac')) {
      // For "QH khác", always fetch fresh data (no caching)
      let lat: number, lng: number;
      
      if (selectedLocation) {
        [lat, lng] = selectedLocation;
        console.log('📍 Using selected location for QH khác:', lat, lng);
      } else if (mapInstance) {
        const center = mapInstance.getCenter();
        lat = center.lat;
        lng = center.lng;
        console.log('🗺️ Using map center for QH khác:', lat, lng);
      } else {
        lat = 21.0285;
        lng = 105.8542;
        console.warn('⚠️ Using fallback coordinates for QH khác:', lat, lng);
      }
      
      console.log('🔄 Fetching fresh map-service data for QH khác...');
      setIsLoadingMapService(true);
      
      const htmlContent = await fetchMapServiceData(lat, lng);
      
      if (htmlContent) {
        // Update cached data for reference
        setCurrentMapServiceData(htmlContent);
        
        setSpecialModalData({
          type: 'qhkhac',
          name: 'QH khác',
          htmlContent: htmlContent
        });
        setShowSpecialModal(true);
        console.log('🔥 Showing QH khác modal with fresh data');
      } else {
        console.warn('⚠️ Failed to fetch fresh map service data');
      }
      
      setIsLoadingMapService(false);
      return;
    } else if (isQhxd || (mapTypeData && mapTypeData.id === 'qhxd')) {
      // For "QH xây dựng", use geocoding HTML if available
      const htmlToUse = geocodingData?.data?.html;
      if (htmlToUse) {
        setSpecialModalData({
          type: 'qhxd',
          name: 'QH xây dựng',
          htmlContent: htmlToUse
        });
        setShowSpecialModal(true);
        console.log('🔥 Showing QH xây dựng modal with geocoding data');
        return;
      } else {
        console.warn('⚠️ No HTML data available for QH xây dựng modal');
      }
    }
    
    // Fallback: Load normal layer if not special case or if special case failed
    if (url) {
      setLayer1Url(url);
      setLayer1Name(name || 'Quy hoạch');
      setActiveMapType(name || layerType);
      console.log(`✅ Đã chuyển sang layer: ${name}`);
    } else {
      console.warn('⚠️ Missing URL for layer:', layerType, name);
    }
    
    // Update all buttons with the same data-type and URL
    setTimeout(() => {
      const allButtons = document.querySelectorAll('.btn--map-switch');
      allButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === layerType && 
            btn.getAttribute('data-url') === url) {
          btn.classList.add('active');
        }
      });
    }, 100);
  };

  // Function removed - now defined with useCallback inside component

  // Add effect to handle map type button clicks
  useEffect(() => {
    if (!isClient) return;

    const handleMapTypeClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.btn--map-switch') as HTMLButtonElement;
      
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        
        const layerType = button.getAttribute('data-type') || '';
        const url = button.getAttribute('data-url') || '';
        const name = button.getAttribute('data-name') || button.textContent?.trim() || '';
        
        if (url && layerType) {
          handleLayerSwitch(layerType, url, name);
        }
      }
    };

    // Add event listener
    document.addEventListener('click', handleMapTypeClick);
    
    return () => {
      document.removeEventListener('click', handleMapTypeClick);
    };
  }, [isClient]);

  // Manual zoom functions
  const handleZoomIn = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  }, [mapInstance]);

  const handleResetZoom = useCallback(() => {
    if (mapInstance) {
      mapInstance.setView(center, 15);
    }
  }, [mapInstance, center]);

  // Fullscreen functions
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const mapElement = document.querySelector('.map-container');
      if (mapElement && mapElement.requestFullscreen) {
        mapElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

    // Add custom CSS for planning overlays
    const style = document.createElement('style');
    style.textContent = `
      .planning-text-overlay {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        pointer-events: none;
      }
      .planning-text-overlay .leaflet-tooltip-content {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .planning-overlay {
        pointer-events: auto;
        cursor: pointer;
        z-index: 1000;
      }
      .planning-overlay:hover {
        transform: scale(1.05);
        transition: transform 0.2s ease;
      }
      
      /* Backdrop for popup */
      .planning-detail-backdrop {
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
      }
      
      /* Custom styling for planning popup */
      .planning-popup .leaflet-popup-content-wrapper {
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border: 1px solid #e5e7eb;
        background: white;
        max-height: 400px;
        overflow: hidden;
        min-width: 280px;
        max-width: 320px;
      }
      
      .planning-popup .leaflet-popup-content {
        margin: 0;
        padding: 0;
        max-height: 400px;
        overflow: hidden;
        width: 100% !important;
      }
      
      .planning-popup .leaflet-popup-close-button {
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        color: #6b7280;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e5e7eb;
        transition: all 0.2s ease;
      }
      
      .planning-popup .leaflet-popup-close-button:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        border-color: #fca5a5;
      }
      
      .planning-popup .leaflet-popup-tip {
        background: white;
        border: 1px solid #e5e7eb;
      }
      
      .planning-html-content {
        font-size: 14px;
        line-height: 1.5;
      }
      
      .planning-html-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
      }
      
      .planning-html-content table td,
      .planning-html-content table th {
        padding: 6px 8px;
        border: 1px solid #e5e7eb;
        text-align: left;
        font-size: 13px;
      }
      
      .planning-html-content table th {
        background-color: #f9fafb;
        font-weight: 600;
        color: #374151;
      }
      
      .planning-html-content table tr:nth-child(even) {
        background-color: #f9fafb;
      }
      
      .planning-html-content strong {
        color: #1f2937;
        font-weight: 600;
      }
      
      .planning-html-content p {
        margin: 6px 0;
      }
      
      /* Style for raw HTML content */
      .planning-raw-html {
        font-family: inherit;
      }
      
      .planning-raw-html .sqh-pin-inf__tle {
        font-weight: bold;
        font-size: 13px;
        color: #1f2937;
        margin-bottom: 4px;
        display: block;
      }
      
      .planning-raw-html .sqh-pin-inf__adr {
        color: #6b7280;
        font-size: 11px;
        margin-bottom: 6px;
        display: block;
      }
      
      .planning-raw-html .type-info {
        background: #f3f4f6;
        padding: 8px;
        border-radius: 6px;
        margin: 8px 0;
        border-left: 4px solid #3b82f6;
      }
      
      .planning-raw-html .type-info__id {
        font-weight: bold;
        color: #1f2937;
      }
      
      .planning-raw-html .type-info__sqr {
        color: #059669;
        font-weight: 600;
      }
      
      .planning-raw-html .type-info__txt {
        color: #6b7280;
        font-size: 13px;
      }
      
      .planning-raw-html .text-col {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 8px;
        margin: 6px 0;
      }
      
      .planning-raw-html .text-col__lbl {
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .planning-raw-html .text-col__txt {
        font-size: 13px;
      }
      
      .planning-raw-html .text-col__txt div {
        padding: 4px 8px;
        border-radius: 4px;
        margin: 2px 0;
      }
      
      /* Geocoding Controls Styling */
      .geocoding-controls {
        font-family: inherit;
      }
      
      .geocoding-controls .sqh-btn-btm__wrp {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .geocoding-controls .sqh-btn-btm__wrp li {
        list-style: none;
        margin: 0;
      }
      
      .geocoding-controls .btn {
        display: inline-block;
        padding: 4px 8px;
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .geocoding-controls .btn:hover {
        background: #e5e7eb;
        color: #1f2937;
        border-color: #9ca3af;
      }
      
      .geocoding-controls .btn.active {
        background: #3b82f6;
        color: white;
        border-color: #2563eb;
      }
      
      .geocoding-controls .btn--sqh-btm {
        margin: 0;
      }
      
      .geocoding-controls .sqh-adr-btm {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e5e7eb;
      }
      
      .geocoding-controls .sqh-adr-btm__txt {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #6b7280;
        font-size: 10px;
      }
      
      .geocoding-controls .sqh-adr-btm__txt i {
        color: #9ca3af;
      }
      
      .geocoding-controls .btn--brch-ctc {
        background: #10b981;
        color: white;
        border-color: #059669;
        font-size: 10px;
        padding: 3px 6px;
      }
      
      .geocoding-controls .btn--brch-ctc:hover {
        background: #059669;
        border-color: #047857;
      }
      
      /* Hide modal and other complex elements */
      .geocoding-controls #Modal-MapTutorialVideo,
      .geocoding-controls .modal {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  if (!isClient) {
    return (
      <div className={`bg-gray-100 animate-pulse rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">Đang tải bản đồ...</p>
      </div>
    );
  }

  // Demo points removed - only show current property marker
  return (
    <div className={className}>
      {/* Map Container */}
      <div className={`map-container rounded-lg overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-[9999] bg-black' : ''}`} style={{ height: isFullscreen ? '100vh' : height }}>
        <MapContainer
          center={center}
          zoom={initialZoom || 15}
          minZoom={8}
          maxZoom={25}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          boxZoom={true}
          keyboard={true}
          preferCanvas={true}
        >
          <MapClickHandler 
            onMapClick={handleMapClick} 
            onZoomChange={setCurrentZoom}
            onMapReady={setMapInstance}
          />
          
          {/* Add the BoundingBoxDrawer component */}
          <BoundingBoxDrawer 
            enabled={isDrawingBoundingBox} 
            onComplete={handleBoundingBoxComplete} 
          />
          
          {/* Planning Overlay Manager - Disabled to remove demo overlays */}
          {/* <PlanningOverlayManager 
            map={mapInstance}
            showOverlay={showPlanningOverlay}
            planningData={planningData}
            overlaysRef={planningOverlaysRef}
            onAreaClick={setSelectedPlanningArea}
          /> */}
          
          {/* Custom Zoom Control */}
          {showControls && (
            <ZoomControl position="bottomright" />
          )}
          
          {/* Base Map Layer - Luôn ở dưới cùng */}
          {showBaseMap && currentBaseMap === 'geoapify' && geoapifyApiKey && (
            <TileLayer
              url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`}
              attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={25}
              maxNativeZoom={18}
              minZoom={8}
              opacity={baseMapOpacity}
              zIndex={1}
              // crossOrigin="anonymous"
            />
          )}
          
          {showBaseMap && currentBaseMap === 'google-satellite' && (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              attribution='&copy; <a href="https://maps.google.com/">Google</a>'
              maxZoom={25}
              maxNativeZoom={20}
              minZoom={8}
              opacity={baseMapOpacity}
              zIndex={1}
              // crossOrigin="anonymous"
            />
          )}
          
          {showBaseMap && currentBaseMap === 'google-hybrid' && (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              attribution='&copy; <a href="https://maps.google.com/">Google</a>'
              maxZoom={25}
              maxNativeZoom={20}
              minZoom={8}
              opacity={baseMapOpacity}
              zIndex={1}
              // crossOrigin="anonymous"
            />
          )}
          
          {/* Layer 1: Bản đồ quy hoạch2030 - Luôn ở trên base map */}
          {showLayer1 && (
            <TileLayer
            key={layer1Url} // Add key to force re-render when URL changes
            url={layer1Url}
            attribution={`&copy; ${layer1Name}`}
            maxZoom={25}
            maxNativeZoom={18}
            minZoom={8}
            opacity={layer1Opacity}
            zIndex={10}
            // crossOrigin="anonymous"
            errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            />
          )}
          
          {/* Layer 2: Bản đồ đất đai Hà Nội - Chỉ hiển thị khi trong khu vực Hà Nội */}
          {showLayer2 && shouldShowHanoiLandLayer && (
            <TileLayer
            url="https://s3-hn-2.cloud.cmctelecom.vn/guland7/land/ha-noi/{z}/{x}/{y}.png"
            attribution='&copy; Bản đồ đất đai Hà Nội'
            maxZoom={25}
            maxNativeZoom={18}
            minZoom={8}
            opacity={layer2Opacity}
            zIndex={20}
            // crossOrigin="anonymous"
            errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            />
          )}
          
          {/* Simple marker without popup */}
          {selectedLocation && (
            <Marker position={selectedLocation}>
            </Marker>
          )}

          {/* Initial position marker (nếu có và khác với selectedLocation) */}
          {initialLat && initialLng && !selectedLocation && (
            <Marker position={[initialLat, initialLng]}>
              <Popup>
                <div className="text-center py-2">
                  <p className="text-gray-700 font-medium text-sm">Vị trí thẩm định</p>
                  <p className="text-gray-600 text-xs">
                    {initialLat.toFixed(4)}, {initialLng.toFixed(4)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Click vào bản đồ để xem thông tin quy hoạch</p>
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
          {/* Demo markers removed - only show current property marker */}
        </MapContainer>
        
        {/* Address Search Bar - Embedded in top-left corner */}
        <div className="absolute top-4 left-4 z-[1000] w-auto">
          <MapAddressSearch onLocationSelect={handleSearchLocationSelect} />
        </div>

        {/* Map Types Selector - Embedded directly in map */}
        <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 border-t shadow-md p-2 z-[1000]">
          <div className="flex flex-nowrap justify-center gap-1 overflow-x-auto pb-1">
            {safeCurrentMapTypes.map((mapType: any) => (
              <button
                key={mapType.id}
                onClick={() => handleLayerSwitch(mapType.layerType, mapType.url, mapType.name)}
                disabled={isLoadingMapService && (mapType.id === 'qhkhac' || mapType.id === 'qhxd')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border rounded-md whitespace-nowrap relative ${
                  activeMapType === mapType.name
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                } ${isLoadingMapService && (mapType.id === 'qhkhac' || mapType.id === 'qhxd') ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: activeMapType === mapType.name ? mapType.color : undefined,
                }}
                data-type={mapType.layerType}
                data-url={mapType.url}
                data-name={mapType.name}
              >
                {/* Update indicator */}
                {isUpdatingMapTypes && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                       title="Đang cập nhật URLs cho vị trí mới"></div>
                )}
                {isLoadingMapService && (mapType.id === 'qhkhac' || mapType.id === 'qhxd') ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  mapType.name
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Special Modal for qhxd and qhkhac */}
        {showSpecialModal && specialModalData && (
          <>
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 z-[2999]"
              onClick={() => setShowSpecialModal(false)}
            ></div>
            
            {/* Modal - Compact & Responsive */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl border z-[3000] max-w-xs sm:max-w-lg w-[95%] sm:w-[85%] lg:w-[60%] max-h-[70vh] sm:max-h-[75vh] overflow-hidden">
              {/* Header - More compact */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-t-lg flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{specialModalData.name}</h3>
                  <p className="text-xs opacity-90">
                    {specialModalData.type === 'qhkhac' 
                      ? 'Thông tin quy hoạch chi tiết - Fresh data từ API'
                      : 'Thông tin quy hoạch xây dựng'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Loading indicator */}
                  {isLoadingMapService && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <button
                    onClick={() => setShowSpecialModal(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
                    title="Đóng"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content - Compact & Responsive */}
              <div className="p-2 sm:p-3 overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="px-3 py-1 text-sm font-bold text-white rounded"
                      style={{ backgroundColor: safeCurrentMapTypes.find((mt: any) => mt.id === specialModalData.type)?.color || '#86efac' }}
                    >
                      {specialModalData.type === 'qhxd' ? 'QH Xây Dựng' : 'QH Khác'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedLocation ? `${selectedLocation[0].toFixed(6)}, ${selectedLocation[1].toFixed(6)}` : 'N/A'}
                    </span>
                    {/* Fresh data indicator */}
                    {specialModalData.type === 'qhkhac' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        🔄 Fresh API
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-2 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-medium text-blue-800 text-xs mb-1">
                      ℹ️ Thông tin đặc biệt
                    </h4>
                    <p className="text-blue-700 text-xs leading-relaxed">
                      {specialModalData.type === 'qhxd' 
                        ? 'Dữ liệu quy hoạch xây dựng chi tiết từ geocoding API.'
                        : 'Dữ liệu quy hoạch khác được fetch fresh mỗi lần click "QH khác". Click vào các quy hoạch để load layer trên bản đồ.'
                      }
                    </p>
                  </div>
                </div>

                {/* Use different components based on modal type */}
                {specialModalData.type === 'qhkhac' ? (
                  <MapServiceDisplay 
                    htmlContent={specialModalData.htmlContent} 
                    onDetailLayerClick={handleDetailLayerLoad}
                  />
                ) : (
                  <PlanningInfoDisplay htmlContent={specialModalData.htmlContent} />
                )}
              </div>

              {/* Footer - More compact */}
              <div className="bg-gray-50 p-2 rounded-b-lg border-t text-xs text-gray-500 flex justify-between items-center">
                <span>📍 Dữ liệu từ API Map-Service {specialModalData.type === 'qhkhac' ? '(Fresh fetch)' : ''}</span>
                <button
                  onClick={() => setShowSpecialModal(false)}
                  className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
                  disabled={isLoadingMapService}
                >
                  {isLoadingMapService ? 'Loading...' : 'Đóng'}
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Instructions overlay */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border z-[1000] max-w-xs">
          {/* Header with toggle button */}
          <div className="flex items-center justify-between p-3 border-b">
            <h4 className="font-semibold text-sm">💡 Hướng dẫn</h4>
            <button
              onClick={() => setIsControlsExpanded(!isControlsExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isControlsExpanded ? "Thu gọn" : "Mở rộng"}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isControlsExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Collapsible content */}
          {isControlsExpanded && (
            <div className="p-3">
              <p className="text-xs text-gray-600 mb-2">
                🎯 Click vào bản đồ để tự động tải thông tin quy hoạch cho vị trí đó
              </p>
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
                <div className="font-medium">✨ Fresh Data Flow:</div>
                <div>• Click map → Load planning data</div>
                <div>• Click "QH khác" → Fresh fetch API data</div>
                <div>• Click links in modal → Load layers</div>
              </div>
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span>Zoom level:</span>
                  <span className="font-mono font-semibold">{currentZoom}/25</span>
                  {currentZoom > 18 && (
                    <span className="text-xs text-orange-600 ml-1">(vỡ pixel)</span>
                  )}
                </div>
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={handleZoomIn}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    title="Zoom Out"
                  >
                    −
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
                    title="Reset Zoom"
                  >
                    ⌂
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                  >
                    {isFullscreen ? '⤡' : '⤢'}
                  </button>
                  <button
                    onClick={() => {
                      if (mapInstance) {
                        const center = mapInstance.getCenter();
                        console.log('🎯 Current map center:', center.lat, center.lng);
                        alert(`Map center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
                      }
                    }}
                    className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                    title="Test current map center"
                  >
                    📍
                  </button>
                </div>
                
                {/* Remove Auto-geocoding toggle and status */}
                
                {/* Base Map Selector */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Base Map:</div>
                  <select
                    value={currentBaseMap}
                    onChange={(e) => setCurrentBaseMap(e.target.value as any)}
                    className="text-xs px-2 py-1 border rounded w-full bg-white"
                  >
                    <option value="google-hybrid">🛰️ Google Hybrid</option>
                    <option value="google-satellite">📍 Google Satellite</option>
                    {geoapifyApiKey && <option value="geoapify">🗺️ Geoapify</option>}
                  </select>
                  
                  {/* Layer Visibility Controls */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700">Hiển thị layers:</div>
                    
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setShowBaseMap(!showBaseMap)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          showBaseMap 
                            ? 'bg-gray-600 text-white' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Ẩn/hiện base map"
                      >
                        Base
                      </button>
                      <button
                        onClick={() => setShowLayer1(!showLayer1)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          showLayer1 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-200 text-blue-600 hover:bg-blue-300'
                        }`}
                        title="Ẩn/hiện layer quy hoạch"
                      >
                        QH
                      </button>
                      <button
                        onClick={() => setShowLayer2(!showLayer2)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          showLayer2 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-200 text-green-600 hover:bg-green-300'
                        }`}
                        title="Ẩn/hiện layer đất đai"
                      >
                        ĐĐ
                      </button>
                      <button
                        onClick={() => setShowPlanningOverlay(!showPlanningOverlay)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          showPlanningOverlay 
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-yellow-200 text-yellow-600 hover:bg-yellow-300'
                        }`}
                        title="Ẩn/hiện text overlay quy hoạch"
                      >
                        📝
                      </button>
                    </div>
                  </div>
                  
                  {/* Layer Opacity Controls */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700">Độ mờ layers:</div>
                    
                    {showBaseMap && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-8">Base:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={baseMapOpacity}
                          onChange={(e) => setBaseMapOpacity(parseFloat(e.target.value))}
                          className="flex-1 h-1"
                        />
                        <span className="text-xs w-8">{Math.round(baseMapOpacity * 100)}%</span>
                      </div>
                    )}
                    
                    {showLayer1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-8">QH:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={layer1Opacity}
                          onChange={(e) => setLayer1Opacity(parseFloat(e.target.value))}
                          className="flex-1 h-1"
                        />
                        <span className="text-xs w-8">{Math.round(layer1Opacity * 100)}%</span>
                      </div>
                    )}
                    
                    {showLayer2 && shouldShowHanoiLandLayer && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-8">ĐĐ:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={layer2Opacity}
                          onChange={(e) => setLayer2Opacity(parseFloat(e.target.value))}
                          className="flex-1 h-1"
                        />
                        <span className="text-xs w-8">{Math.round(layer2Opacity * 100)}%</span>
                      </div>
                    )}
                    {showLayer2 && !shouldShowHanoiLandLayer && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-8 text-gray-400">ĐĐ:</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-gray-400">Chỉ dành cho HN</span>
                          </div>
                        </div>
                        <span className="text-xs w-8 text-gray-400">N/A</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compact view when collapsed */}
          {!isControlsExpanded && (
            <div className="p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  Zoom: {currentZoom}/25
                  {currentZoom > 18 && <span className="text-orange-600 ml-1">(vỡ pixel)</span>}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleZoomIn}
                    className="px-1.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="px-1.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    title="Zoom Out"
                  >
                    −
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="px-1.5 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                  >
                    {isFullscreen ? '⤡' : '⤢'}
                  </button>
                  <button
                    onClick={() => {
                      if (mapInstance) {
                        const center = mapInstance.getCenter();
                        console.log('🎯 Current map center:', center.lat, center.lng);
                        alert(`Map center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
                      }
                    }}
                    className="px-1.5 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                    title="Test current map center"
                  >
                    📍
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Planning Area Detail Popup */}
        {selectedPlanningArea && (
          <>
            {/* Backdrop */}
            <div 
              className="absolute inset-0 planning-detail-backdrop z-[1999]"
              onClick={() => setSelectedPlanningArea(null)}
            ></div>
            
            {/* Popup */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl border z-[2000] max-w-md w-full mx-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Thửa {selectedPlanningArea.detailInfo.id}</h3>
                <p className="text-sm opacity-90">Diện tích {selectedPlanningArea.detailInfo.area}</p>
              </div>
              <button
                onClick={() => setSelectedPlanningArea(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
                title="Đóng"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Address */}
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-600">{selectedPlanningArea.detailInfo.address}</span>
              </div>

              {/* Land Type Badge */}
              <div className="flex items-center gap-2">
                <span 
                  className="px-3 py-1 text-sm font-bold text-white rounded"
                  style={{ backgroundColor: selectedPlanningArea.color }}
                >
                  {selectedPlanningArea.detailInfo.landType}
                </span>
                <span className="text-sm text-gray-600">{selectedPlanningArea.detailInfo.area} đất ở tại đô thị</span>
              </div>

              {/* Planning Info */}
              <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                <h4 className="font-semibold text-yellow-800 text-sm mb-1">THÔNG TIN QUY HOẠCH XÂY DỰNG</h4>
                <p className="text-yellow-700 text-sm font-medium bg-yellow-200 px-2 py-1 rounded">
                  {selectedPlanningArea.detailInfo.planningType}
                </p>
                <p className="text-yellow-600 text-xs mt-2">
                  {selectedPlanningArea.detailInfo.restrictions.join(', ')}
                </p>
              </div>

              {/* Building Ratio */}
              <div className="text-sm">
                <span className="font-medium text-gray-700">Hệ số sử dụng đất: </span>
                <span className="text-gray-600">{selectedPlanningArea.detailInfo.buildingRatio}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition-colors">
                  🏠 Ký hiệu đất
                </button>
                <button className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 transition-colors">
                  📍 Chỉ đường
                </button>
                <button className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded text-sm font-medium hover:bg-purple-200 transition-colors">
                  📏 Đo vẽ
                </button>
                <button className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 rounded text-sm font-medium hover:bg-orange-200 transition-colors">
                  📊 Bảng tọa độ
                </button>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="bg-gray-50 p-3 rounded-b-lg border-t text-xs text-gray-500">
              📢 Đóng bản / Lưu thửa này lên bản đồ
            </div>
          </div>
          </>
        )}

        {/* Compact Planning Info Panel - Overlay inside map */}
        {(selectedLocation || isLoading || planningData) && (
          <div className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border overflow-hidden z-[1000] transition-all duration-300 ${
            isPlanningPanelMinimized 
              ? 'max-w-xs w-80' 
              : 'max-w-sm w-96'
          }`}>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">📍 Thông tin quy hoạch</span>
                {isLoading && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPlanningPanelMinimized(!isPlanningPanelMinimized)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
                  title={isPlanningPanelMinimized ? "Mở rộng" : "Thu nhỏ"}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isPlanningPanelMinimized ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setPlanningData(null);
                    setError(null);
                    setIsPlanningPanelMinimized(false);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
                  title="Đóng"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  </button>
              </div>
            </div>

            {!isPlanningPanelMinimized && (
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-xs">Đang tải thông tin...</span>
                  </div>
                ) : error ? (
                  <div className="text-red-600 text-xs">
                    <p className="font-medium">Lỗi:</p>
                    <p>{error}</p>
                  </div>
                ) : planningData?.data ? (
                  <div className="text-xs">
                    <PlanningInfoCompact 
                      planningData={planningData}
                      selectedLocation={selectedLocation}
                      onLayerSwitch={handleLayerSwitch}
                    />
                  </div>
                ) : selectedLocation ? (
                  <div className="text-gray-600 text-xs">
                    <p>Tọa độ: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}</p>
                    <p className="text-xs text-gray-500 mt-1">Chưa có dữ liệu quy hoạch</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Map Type Buttons - Removed from outside the map container */}
      
      {/* ... existing code ... */}

      {/* Add analysis tools panel */}
      {showControls && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-white rounded-lg shadow-md border p-2 space-y-2">
            <button
              onClick={() => setIsDrawingBoundingBox(!isDrawingBoundingBox)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isDrawingBoundingBox
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              title={isDrawingBoundingBox ? 'Hủy vẽ' : 'Vẽ vùng phân tích'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="hidden sm:inline">{isDrawingBoundingBox ? 'Hủy vẽ' : 'Vẽ vùng phân tích'}</span>
            </button>
            
            {analysisAreaBounds && (
              <button
                onClick={captureAreaScreenshot}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors w-full"
                title="Phân tích quy hoạch"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="hidden sm:inline">Phân tích quy hoạch</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isDrawingBoundingBox && (
        <div className="absolute top-16 left-4 right-4 z-[1000] bg-blue-100 bg-opacity-90 text-blue-800 p-3 rounded-lg shadow-md border border-blue-300">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium mb-1">Đang trong chế độ vẽ vùng phân tích</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Click chuột vào một điểm để bắt đầu</li>
                <li>Giữ và kéo để tạo một hình chữ nhật</li>
                <li>Thả chuột để hoàn thành</li>
              </ol>
              <p className="text-xs mt-1">Nhấn nút "Hủy vẽ" để thoát khỏi chế độ vẽ</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
