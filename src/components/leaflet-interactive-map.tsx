'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Navigation, Search, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getGeoapifyApiKey } from '@/lib/config';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
}

interface LeafletInteractiveMapProps {
  onLocationSelect?: (location: LocationData) => void;
  initialLocation?: { lat: number; lng: number };
  authToken?: string;
  showValuationButton?: boolean;
}

interface SearchSuggestion {
  formatted: string;
  lat: number;
  lon: number;
  place_id: string;
  address_line1?: string;
  address_line2?: string;
  category?: string;
}

// Custom marker icon để fix lỗi default icon của Leaflet
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component xử lý click event trên map
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      const { lat, lng } = event.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

export function LeafletInteractiveMap({ 
  onLocationSelect, 
  initialLocation = { lat: 21.0282993, lng: 105.8539963 }, // Hanoi center
  authToken,
  showValuationButton = true 
}: LeafletInteractiveMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([initialLocation.lat, initialLocation.lng]);
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      // Update map center và marker
      setMapCenter([lat, lng]);
      setMarkerPosition([lat, lng]);
      
      // Get location info from coordinates
      const response = await fetch(`/api/location?latitude=${lat}&longitude=${lng}`);
      const data = await response.json();
      
      if (data.success) {
        const locationData: LocationData = {
          latitude: lat,
          longitude: lng,
          address: data.parsed_address.formatted_address,
          city: data.parsed_address.city,
          district: data.parsed_address.district,
          ward: data.parsed_address.ward,
        };
        
        setSelectedLocation(locationData);
        
        if (onLocationSelect) {
          onLocationSelect(locationData);
        }
        
        toast({
          title: "Đã chọn vị trí",
          description: `${data.parsed_address.formatted_address}`,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Lỗi",
        description: "Không thể lấy thông tin địa chỉ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    toast({
      title: "Đã click trên bản đồ",
      description: `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    });
    handleLocationSelect(lat, lng);
  };

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&lang=vi&limit=8&bias=countrycode:vn&apiKey=${getGeoapifyApiKey()}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const suggestionsList: SearchSuggestion[] = data.features.map((feature: any) => ({
          formatted: feature.properties.formatted || feature.properties.address_line1 || '',
          lat: feature.properties.lat,
          lon: feature.properties.lon,
          place_id: feature.properties.place_id || Math.random().toString(),
          address_line1: feature.properties.address_line1,
          address_line2: feature.properties.address_line2,
          category: feature.properties.category,
        }));
        
        setSuggestions(suggestionsList);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchAddress(value);
    
    const timeoutId = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchAddress(suggestion.formatted);
    setShowSuggestions(false);
    handleLocationSelect(suggestion.lat, suggestion.lon);
  };

  const clearSearch = () => {
    setSearchAddress('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handleLocationSelect(latitude, longitude);
        },
        (error) => {
          setIsLoading(false);
          toast({
            title: "Lỗi",
            description: "Không thể lấy vị trí hiện tại",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleSearchLocation = async () => {
    if (!searchAddress.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchAddress)}&lang=vi&limit=1&bias=countrycode:vn&apiKey=${getGeoapifyApiKey()}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const lat = feature.properties.lat;
        const lon = feature.properties.lon;
        handleLocationSelect(lat, lon);
      } else {
        toast({
          title: "Không tìm thấy",
          description: "Không tìm thấy địa chỉ này",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Lỗi",
        description: "Lỗi khi tìm kiếm địa chỉ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValuation = async () => {
    if (!selectedLocation || !authToken) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn vị trí và cung cấp auth token",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/complete-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          property_details: {
            type: 'town_house',
            landArea: 60.0,
            houseArea: 55.0,
            bedRoom: 3,
            bathRoom: 2,
            legal: 'pink_book',
          },
          auth_token: authToken,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Định giá thành công",
          description: "Kết quả định giá đã được tạo",
        });
      } else {
        throw new Error(data.error || 'Valuation failed');
      }
    } catch (error) {
      console.error('Valuation error:', error);
      toast({
        title: "Lỗi định giá",
        description: "Không thể thực hiện định giá",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Leaflet Interactive Map - Click để chọn vị trí
        </CardTitle>
        <CardDescription>
          Click trực tiếp trên bản đồ hoặc tìm kiếm địa chỉ để chọn vị trí định giá bất động sản
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Location Controls */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Label htmlFor="search">Tìm kiếm địa chỉ</Label>
              <div className="flex gap-2 relative">
                <div className="relative flex-1">
                  <Input
                    ref={searchInputRef}
                    id="search"
                    placeholder="Nhập địa chỉ (VD: Hoàn Kiếm, Hà Nội)..."
                    value={searchAddress}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                    onFocus={() => searchAddress.length > 1 && fetchSuggestions(searchAddress)}
                  />
                  {searchAddress && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                      {isLoadingSuggestions ? (
                        <div className="p-3 text-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                          <span className="text-sm">Đang tìm kiếm...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="py-1">
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={suggestion.place_id || index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {suggestion.address_line1 || suggestion.formatted}
                                  </p>
                                  {suggestion.address_line2 && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {suggestion.address_line2}
                                    </p>
                                  )}
                                  {suggestion.category && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {suggestion.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-gray-500">
                          <span className="text-sm">Không tìm thấy kết quả</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleSearchLocation} 
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={handleGetCurrentLocation} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Vị trí hiện tại
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Vị trí đã chọn
            </h4>
            <div className="space-y-1 text-sm">
              {selectedLocation.address && (
                <p><strong>Địa chỉ:</strong> {selectedLocation.address}</p>
              )}
              <p><strong>Tọa độ:</strong> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}</p>
              {selectedLocation.city && (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{selectedLocation.city}</Badge>
                  {selectedLocation.district && <Badge variant="secondary">{selectedLocation.district}</Badge>}
                  {selectedLocation.ward && <Badge variant="secondary">{selectedLocation.ward}</Badge>}
                </div>
              )}
            </div>
            {showValuationButton && authToken && (
              <Button 
                onClick={handleValuation} 
                disabled={isLoading}
                className="w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang định giá...
                  </>
                ) : (
                  'Định giá tại vị trí này'
                )}
              </Button>
            )}
          </div>
        )}

        {/* Leaflet Map */}
        <div className="aspect-video w-full rounded-lg border overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Click handler */}
            <MapClickHandler onMapClick={handleMapClick} />
            
            {/* Marker hiển thị vị trí đã chọn */}
            {markerPosition && (
              <Marker position={markerPosition} icon={customIcon}>
                <Popup>
                  {selectedLocation ? (
                    <div className="p-2">
                      <p className="font-medium">Vị trí đã chọn</p>
                      {selectedLocation.address && (
                        <p className="text-sm text-gray-600">{selectedLocation.address}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <p>Vị trí đã chọn</p>
                  )}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="text-sm text-gray-600">
          💡 <strong>Hướng dẫn:</strong> Click trực tiếp trên bản đồ để chọn vị trí, hoặc gõ địa chỉ và chọn từ gợi ý. 
          Bạn cũng có thể sử dụng vị trí hiện tại.
        </div>

        {/* Quick Location Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchAddress('Hoàn Kiếm, Hà Nội');
              handleLocationSelect(21.0285, 105.8542);
            }}
          >
            📍 Hoàn Kiếm, HN
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchAddress('Quận 1, TP.HCM');
              handleLocationSelect(10.7769, 106.7009);
            }}
          >
            📍 Quận 1, HCM
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchAddress('Đà Nẵng');
              handleLocationSelect(16.0471, 108.2068);
            }}
          >
            📍 Đà Nẵng
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 