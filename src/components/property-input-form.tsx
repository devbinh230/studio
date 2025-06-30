'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getValuationAndSummary } from '@/app/actions';
import type { CombinedResult } from '@/lib/types';
import { Home, Loader2, Cpu, Globe, MapPin, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultAuthToken, getGeoapifyApiKey } from '@/lib/config';

const formSchema = z.object({
  address: z.string().min(5, 'Vui lòng nhập địa chỉ hợp lệ.'),
  size: z.coerce.number().min(10, 'Diện tích phải lớn hơn 10m².'),
  bedrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng ngủ.'),
  bathrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng tắm.'),
  lotSize: z.coerce.number().min(10, 'Diện tích lô đất phải lớn hơn 10m².'),
});

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
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

type PropertyInputFormProps = {
  setResult: (data: CombinedResult | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  selectedLocation?: LocationData | null;
  onLocationSelect?: (location: LocationData) => void;
};

export function PropertyInputForm({
  setResult,
  setIsLoading,
  setError,
  selectedLocation,
  onLocationSelect,
}: PropertyInputFormProps) {
  const [useRealApi, setUseRealApi] = useState(true); // Default to real API
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: '19 Nguyễn Hữu Cảnh, Phường 19, Bình Thạnh, TP. HCM',
      size: 110,
      bedrooms: 3,
      bathrooms: 2,
      lotSize: 120,
    },
  });

  // Auto-fill address when location is selected from map
  useEffect(() => {
    if (selectedLocation?.address) {
      form.setValue('address', selectedLocation.address);
      // Clear suggestions when auto-filling from map
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [selectedLocation, form]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    form.setValue('address', suggestion.formatted);
    setShowSuggestions(false);
    
    // Tạo LocationData từ suggestion và gọi onLocationSelect
    if (onLocationSelect) {
      const locationData: LocationData = {
        latitude: suggestion.lat,
        longitude: suggestion.lon,
        address: suggestion.formatted,
        // Có thể parse thêm city, district, ward từ address nếu cần
      };
      onLocationSelect(locationData);
    }
    
    toast({
      title: "Đã chọn địa chỉ",
      description: suggestion.formatted,
    });
  };

  const handleAddressInputChange = (value: string) => {
    form.setValue('address', value);
    
    // Debounce suggestions fetch
    const timeoutId = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const clearAddressInput = () => {
    form.setValue('address', '');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (useRealApi) {
        // Use /api/complete-flow endpoint
        if (!selectedLocation?.latitude || !selectedLocation?.longitude) {
          setError('Vui lòng chọn vị trí trên bản đồ trước khi định giá.');
          setIsLoading(false);
          return;
        }

                                   const authToken = getDefaultAuthToken();

        const payload = {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          property_details: {
            type: 'town_house',
            landArea: values.lotSize,
            houseArea: values.size,
            laneWidth: 10.0,
            facadeWidth: 4.0,
            storyNumber: 3.0,
            bedRoom: values.bedrooms,
            bathRoom: values.bathrooms,
            legal: 'pink_book',
          },
          auth_token: authToken,
        };

                 const response = await fetch('/api/complete-flow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setResult(result as CombinedResult);
          
          // Show notification if using mock data
          if (result.error && result.error.includes('mock')) {
            toast({
              title: "⚠️ Thông báo",
              description: "Đang sử dụng dữ liệu mẫu do vấn đề với API thực tế",
              variant: "destructive",
            });
          }
        } else {
          setError(result.error || 'Định giá thất bại');
        }
      } else {
        // Use AI mock data
        const result = await getValuationAndSummary(values);

        if (result.success) {
          setResult(result.data);
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.');
      console.error('Valuation error:', error);
    }
    
    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Home className="h-6 w-6 text-primary" />
          Thông tin Bất động sản
        </CardTitle>
        <CardDescription>
          {selectedLocation ? 
            'Điền thông tin bất động sản cho vị trí đã chọn để nhận định giá.' :
            'Chọn vị trí trên bản đồ và nhập thông tin bất động sản để nhận định giá.'
          }
        </CardDescription>
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="api-mode"
              checked={useRealApi}
              onCheckedChange={setUseRealApi}
            />
            <label htmlFor="api-mode" className="text-sm font-medium cursor-pointer">
              {useRealApi ? (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span>API thực tế</span>
                  <Badge variant="default" className="text-xs">
                  Bytesel.com
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span>AI mô phỏng</span>
                  <Badge variant="secondary" className="text-xs">
                    Demo
                  </Badge>
                </div>
              )}
            </label>
          </div>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        ref={addressInputRef}
                        placeholder="Nhập địa chỉ (VD: Hoàn Kiếm, Hà Nội)..." 
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          handleAddressInputChange(e.target.value);
                        }}
                        onFocus={() => field.value.length > 1 && fetchSuggestions(field.value)}
                        className={selectedLocation ? 'bg-green-50 border-green-200' : ''}
                      />
                      {field.value && (
                        <button
                          type="button"
                          onClick={clearAddressInput}
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
                                  type="button"
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
                  </FormControl>
                  <FormMessage />
                  {selectedLocation ? (
                    <p className="text-xs text-green-600">
                      ✅ Địa chỉ được tự động điền từ vị trí đã chọn trên bản đồ
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      💡 Gõ địa chỉ để xem gợi ý tự động
                    </p>
                  )}
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diện tích (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lotSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diện tích đất (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phòng ngủ</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phòng tắm</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90" 
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {useRealApi ? 'Đang định giá (API thực)...' : 'Đang định giá (AI)...'}
                </>
              ) : (
                <>
                  {useRealApi ? (
                    <Globe className="mr-2 h-4 w-4" />
                  ) : (
                    <Cpu className="mr-2 h-4 w-4" />
                  )}
                  {selectedLocation ? 
                    (useRealApi ? 'Định giá thực tế tại vị trí này' : 'Định giá AI tại vị trí này') : 
                    (useRealApi ? 'Định giá thực tế' : 'Định giá AI')
                  }
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
