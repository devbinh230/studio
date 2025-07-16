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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { CombinedResult } from '@/lib/types';
import { 
  Home, 
  Loader2, 
  MapPin, 
  X, 
  Building, 
  Ruler, 
  FileText, 
  Layers,
  Bath,
  Bed,
  Square,
  TreeDeciduous,
  Calendar,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultAuthToken, getGeoapifyApiKey } from '@/lib/config';

const formSchema = z.object({
  address: z.string().min(5, 'Vui lòng nhập địa chỉ hợp lệ.'),
  type: z.enum(['nha_rieng', 'dat', 'dat_nen_du_an', 'can_ho_chung_cu', 'lien_ke', 'biet_thu'], {
    required_error: 'Vui lòng chọn loại bất động sản.',
  }),
  roadWidth: z.enum(['ngo_ngach', 'ngo_oto_do_cua', 'ngo_1_oto', 'ngo_2_oto_tranh', 'ngo_3_oto_tranh', 'ngo_4_oto_tranh', 'ngo_4_oto_tro_len', 'mat_pho'], {
    required_error: 'Vui lòng chọn đường rộng.',
  }),
  houseArea: z.coerce.number().min(10, 'Diện tích sàn phải lớn hơn 10m².'),
  landArea: z.coerce.number().min(10, 'Diện tích đất phải lớn hơn 10m².'),
  facadeWidth: z.coerce.number().min(1, 'Chiều rộng mặt tiền phải lớn hơn 1m.').optional(),
  buildingArea: z.coerce.number().min(10, 'Diện tích xây dựng phải lớn hơn 10m².').optional(),
  storyNumber: z.coerce.number().min(1, 'Phải có ít nhất 1 tầng.'),
  bedrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng ngủ.'),
  bathrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng tắm.').optional(),
  legal: z.enum(['contract', 'white_book', 'pink_book', 'red_book'], {
    required_error: 'Vui lòng chọn tình trạng pháp lý.',
  }),
  legalIssues: z.array(z.enum(['xay_lan_hang_xom', 'so_chung_tranh_chap', 'giay_to_viet_tay', 'dinh_quy_hoach'])).optional(),
  yearBuilt: z.coerce.number().min(1900, 'Năm xây dựng phải từ 1900 trở lên.').max(new Date().getFullYear(), `Năm xây dựng không thể lớn hơn ${new Date().getFullYear()}.`).optional(),
  alleyType: z.enum(['thong', 'cut'], {
    required_error: 'Vui lòng chọn loại ngõ.',
  }).optional(),
  houseDirection: z.enum(['dong', 'tay', 'nam', 'bac'], {
    required_error: 'Vui lòng chọn hướng nhà.',
  }).optional(),
  soShape: z.enum(['vuong', 'no_hau', 'thop_hau', 'phuc_tap'], {
    required_error: 'Vui lòng chọn hình dáng sổ.',
  }).optional(),
  constructionLevel: z.enum(['noi_that_co_ban', 'noi_that_cao_cap', 'xay_tho', 'noi_that_day_du'], {
    required_error: 'Vui lòng chọn mức độ xây dựng.',
  }).optional(),
  houseQuality: z.enum(['30', '40', '50', '60', '70', '80', '90', '100'], {
    required_error: 'Vui lòng chọn chất lượng nhà còn lại.',
  }).optional(),
  disadvantages: z.array(z.string()).optional(),
  advantages: z.array(z.string()).optional(),
});

// Property type options with Vietnamese labels - Updated based on HTML
const propertyTypes = [
  { value: 'nha_rieng', label: 'Nhà riêng', icon: Home },
  { value: 'dat', label: 'Đất', icon: Square },
  { value: 'dat_nen_du_an', label: 'Đất nền dự án', icon: Square },
  { value: 'can_ho_chung_cu', label: 'Căn hộ chung cư', icon: Building },
  { value: 'lien_ke', label: 'Liền kề', icon: Home },
  { value: 'biet_thu', label: 'Biệt thự', icon: TreeDeciduous },
] as const;

// Road width options based on HTML
const roadWidthOptions = [
  { value: 'ngo_4_oto_tro_len', label: 'Ngõ 4 ô tô trở lên', description: '(>11m)' },
  { value: 'ngo_4_oto_tranh', label: 'Ngõ 4 ô tô tránh', description: '(9-11m)' },
  { value: 'ngo_3_oto_tranh', label: 'Ngõ 3 ô tô tránh', description: '(7-9m)' },
  { value: 'ngo_2_oto_tranh', label: 'Ngõ 2 ô tô tránh', description: '(5-7m)' },
  { value: 'ngo_1_oto', label: 'Ngõ 1 ô tô', description: '(2,5-5m)' },
  { value: 'ngo_oto_do_cua', label: 'Ngõ ô tô đỗ cửa', description: '' },
  { value: 'ngo_ngach', label: 'Ngõ ngách', description: '(< 2,5m)' },
  { value: 'mat_pho', label: 'Mặt phố - Mặt đường', description: '' },
] as const;

// Legal issues options
const legalIssuesOptions = [
  { value: 'xay_lan_hang_xom', label: 'Xây lấn hàng xóm/ Hàng xóm xây lấn' },
  { value: 'so_chung_tranh_chap', label: 'Sổ chung, tranh chấp quyền sử dụng' },
  { value: 'giay_to_viet_tay', label: 'Giấy tờ viết tay' },
  { value: 'dinh_quy_hoach', label: 'Dính quy hoạch 1 phần' },
] as const;

// Construction level options
const constructionLevelOptions = [
  { 
    value: 'noi_that_co_ban', 
    label: 'Nội thất cơ bản',
    description: 'Đã có kệ bếp, tiện ích cơ bản nhà tắm/ vệ sinh...'
  },
  { 
    value: 'noi_that_cao_cap', 
    label: 'Nội thất cao cấp',
    description: 'Nội thất đầy đủ, có mức độ đầu tư cao về giá trị.'
  },
  { 
    value: 'xay_tho', 
    label: 'Xây thô',
    description: 'Chưa có nội thất, nhà mới chỉ bàn giao thô.'
  },
  { 
    value: 'noi_that_day_du', 
    label: 'Nội thất đầy đủ',
    description: 'Nội thất đã hoàn thiện đầy đủ, mức độ giá trị nội thất ở tầm trung.'
  },
] as const;

// House quality options
const houseQualityOptions = [
  { value: '30', label: '30%' },
  { value: '40', label: '40%' },
  { value: '50', label: '50%' },
  { value: '60', label: '60%' },
  { value: '70', label: '70%' },
  { value: '80', label: '80%' },
  { value: '90', label: '90%' },
  { value: '100', label: '100%' },
] as const;

// Disadvantages data structure
const disadvantagesData = {
  'hinh_dang': {
    title: 'Đặc điểm hình dáng',
    options: []
  },
  'vi_tri': {
    title: 'Đặc điểm vị trí',
    options: [
      { value: 'gan_cho_bua', label: 'Chợ búa' },
      { value: 'cong_lap', label: 'Cống lấp (trên cống/ cống trước cửa)' },
      { value: 'cong_thoi', label: 'Cống thối (trên cống/ cống trước cửa)' },
      { value: 'gan_duong_cao_toc', label: 'Gần đường cao tốc <30m' },
      { value: 'gan_cong_thoi', label: 'Gần cống thối' },
      { value: 'chan_cau_vuot', label: 'Chân cầu vượt' },
      { value: 'tram_dung_xe_bus', label: 'Trạm dừng xe bus' },
      { value: 'chan_cau_di_bo', label: 'Chân cầu đi bộ' },
      { value: 'canh_nha_may', label: 'Cạnh/gần nhà máy' },
      { value: 'doi_dien_toa_an', label: 'Đối diện tòa án doanh trại công an' },
      { value: 'cau_vuot_tren_cao', label: 'Cầu vượt trên cao' },
      { value: 'gan_nha_nghi', label: 'Gần nhà nghỉ' },
      { value: 'giap_truong_hoc', label: 'Giáp trường học - xí nghiệp - tập thể chung' },
      { value: 'gan_benh_vien', label: 'Gần hoặc giáp bệnh viện dưới 50m' },
      { value: 'sau_nha_hang', label: 'Sau nhà hàng - bị mùi - rác thải' },
      { value: 'cuoi_ngo', label: 'Cuối ngõ' },
      { value: 'khe_dam', label: 'Khe đâm' },
      { value: 'ngo_cut', label: 'Ngõ cụt' },
      { value: 'tren_doc', label: 'Trên dốc' },
      { value: 'duong_gom', label: 'Đường gom' },
      { value: 'bazie', label: 'Bazie' },
      { value: 'tru_dien', label: 'Trụ điện - bốt điện - trạm điện - cột điện' },
      { value: 'khong_co_he', label: 'Không có hè - hè bé dưới 1m' },
      { value: 'cong_chung', label: 'Cổng chung' },
      { value: 'dan_tri_thap', label: 'Dân trí thấp' },
      { value: 'cam_oto', label: 'Cấm ô tô' },
      { value: 'cam_de_xe', label: 'Cấm để xe vỉa hè' },
      { value: 'duong_1_chieu', label: 'Đường 1 chiều' },
      { value: 'oto_1_chieu', label: 'Ô tô 1 chiều' },
      { value: 'ngo_xau', label: 'Ngõ xấu - lộn xộn - ngoằn ngoèo' },
      { value: 'he_doc_cao', label: 'Hè dốc cao' },
      { value: 'trung_nuoc', label: 'Trũng nước ngập' },
      { value: 'vi_tri_toi', label: 'Vị trí tối- khu âm u - khuất' },
      { value: 'duong_thuc_dit', label: 'Đường thúc đít' },
      { value: 'hay_tac_duong', label: 'Hay tắc đường' },
      { value: 'bi_cat_mat_do', label: 'Bị cắt mật độ - không xây hết đất' },
      { value: 'duong_bo_dan_cu', label: 'Đường bo dân cư - khu đô thị' },
      { value: 'truc_ngang', label: 'Trục ngang - Đường phụ (Cho thuê giá thấp - ít người qua lại)' },
      { value: 'qua_duong_tau', label: 'Qua đường tàu' },
      { value: 'duong_dam', label: 'Đường đâm' },
    ]
  },
  'tam_linh': {
    title: 'Đặc điểm Tâm Linh',
    options: []
  },
  'quy_hoach': {
    title: 'Quy hoạch và pháp lý',
    options: []
  }
};

// Advantages data structure
const advantagesData = {
  'hinh_dang_xay_dung': {
    title: 'Đặc điểm hình dáng, xây dựng',
    options: [
      { value: 'co_tang_ham', label: 'Có tầng hầm' },
      { value: 'dua_duoc_rong', label: 'Đua được rộng thêm 1m' },
      { value: 'dat_vuong', label: 'Đất vuông' },
      { value: 'dat_no_hau', label: 'Đất nở hậu' },
      { value: 'chac_chan_xay_cao', label: 'Chắc chắn xây cao trên 6 tầng' },
    ]
  },
  'vi_tri': {
    title: 'Đặc điểm vị trí',
    options: []
  },
  'quy_hoach': {
    title: 'Quy hoạch và pháp lý',
    options: []
  }
};

// Legal status options with Vietnamese labels
const legalOptions = [
  { value: 'red_book', label: 'Sổ đỏ' },
  { value: 'pink_book', label: 'Sổ hồng' },
  { value: 'white_book', label: 'Sổ trắng' },
  { value: 'contract', label: 'Hợp đồng' },
] as const;

// Alley type options with Vietnamese labels
const alleyTypeOptions = [
  { value: 'thong', label: 'Ngõ thông' },
  { value: 'cut', label: 'Ngõ cụt' },
] as const;

// House direction options with Vietnamese labels
const houseDirectionOptions = [
  { value: 'dong', label: 'Đông' },
  { value: 'tay', label: 'Tây' },
  { value: 'nam', label: 'Nam' },
  { value: 'bac', label: 'Bắc' },
] as const;

// Sổ shape options
const soShapeOptions = [
  { value: 'vuong', label: 'Sổ vuông' },
  { value: 'no_hau', label: 'Nở hậu' },
  { value: 'thop_hau', label: 'Thóp hậu' },
  { value: 'phuc_tap', label: 'Phức tạp' },
] as const;

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
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Dialog states
  const [showDisadvantagesDialog, setShowDisadvantagesDialog] = useState(false);
  const [showAdvantagesDialog, setShowAdvantagesDialog] = useState(false);
  const [selectedDisadvantageCategory, setSelectedDisadvantageCategory] = useState('vi_tri');
  const [selectedAdvantageCategory, setSelectedAdvantageCategory] = useState('hinh_dang_xay_dung');
  const [tempDisadvantages, setTempDisadvantages] = useState<string[]>([]);
  const [tempAdvantages, setTempAdvantages] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: '21°01\'41.9"N 105°51\'14.4"E, Phường Lý Thái Tổ, Quận Hoàn Kiếm, Hà Nội',
      type: 'nha_rieng',
      roadWidth: 'ngo_1_oto',
      houseArea: 33,
      landArea: 33,
      facadeWidth: 3,
      buildingArea: 33,
      storyNumber: 4,
      bedrooms: 3,
      bathrooms: 2,
      legal: 'contract',
      legalIssues: [],
      yearBuilt: 2015,
      alleyType: 'thong',
      houseDirection: 'nam',
      soShape: 'vuong',
      constructionLevel: 'noi_that_co_ban',
      houseQuality: '80',
      disadvantages: [],
      advantages: [],
    },
  });

  // Auto-fill address when location is selected from map
  useEffect(() => {
    if (selectedLocation?.address) {
      form.setValue('address', selectedLocation.address);
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
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&lang=vi&limit=5&bias=countrycode:vn&apiKey=${getGeoapifyApiKey()}`
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
    
    if (onLocationSelect) {
      const locationData: LocationData = {
        latitude: suggestion.lat,
        longitude: suggestion.lon,
        address: suggestion.formatted,
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

  // Dialog handlers
  const handleDisadvantagesDialogOpen = () => {
    setTempDisadvantages(form.getValues('disadvantages') || []);
    setShowDisadvantagesDialog(true);
  };

  const handleAdvantagesDialogOpen = () => {
    setTempAdvantages(form.getValues('advantages') || []);
    setShowAdvantagesDialog(true);
  };

  const handleDisadvantagesApply = () => {
    form.setValue('disadvantages', tempDisadvantages);
    setShowDisadvantagesDialog(false);
  };

  const handleAdvantagesApply = () => {
    form.setValue('advantages', tempAdvantages);
    setShowAdvantagesDialog(false);
  };

  const handleDisadvantagesReset = () => {
    setTempDisadvantages([]);
  };

  const handleAdvantagesReset = () => {
    setTempAdvantages([]);
  };

  const toggleDisadvantageOption = (value: string) => {
    setTempDisadvantages(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const toggleAdvantageOption = (value: string) => {
    setTempAdvantages(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const getSelectedDisadvantageLabels = () => {
    const selected = form.getValues('disadvantages') || [];
    return selected.map(value => {
      for (const category of Object.values(disadvantagesData)) {
        const option = category.options.find(opt => opt.value === value);
        if (option) return option.label;
      }
      return value;
    });
  };

  const getSelectedAdvantageLabels = () => {
    const selected = form.getValues('advantages') || [];
    return selected.map(value => {
      for (const category of Object.values(advantagesData)) {
        const option = category.options.find(opt => opt.value === value);
        if (option) return option.label;
      }
      return value;
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
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
          type: values.type,
          landArea: values.landArea,
          houseArea: values.houseArea,
          roadWidth: values.roadWidth,
          facadeWidth: values.facadeWidth,
          buildingArea: values.buildingArea,
          storyNumber: values.storyNumber,
          bedRoom: values.bedrooms,
          bathRoom: values.bathrooms,
          legal: values.legal,
          legalIssues: values.legalIssues,
          yearBuilt: values.yearBuilt,
          alleyType: values.alleyType,
          houseDirection: values.houseDirection,
          soShape: values.soShape,
          constructionLevel: values.constructionLevel,
          houseQuality: values.houseQuality,
          disadvantages: values.disadvantages,
          advantages: values.advantages,
        },
        auth_token: authToken,
      };
      
      // Debug logging for payload
      console.log('📤 Sending payload:', payload);

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
      
      // Debug logging
      console.log('🔍 API Response:', result);
      console.log('🔍 AI Valuation exists:', !!result.ai_valuation);
      console.log('🔍 Error:', result.error);

      if (result.success) {
        // Check if there's an explicit error message from the API
        if (result.error) {
          setError(result.error);
          toast({
            title: "❌ Lỗi API",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        
        // Check if AI valuation data exists (new API structure doesn't use ai_valuation.success)
        if (!result.ai_valuation) {
          const aiError = 'AI Valuation không thành công - vui lòng thử lại';
          setError(aiError);
          toast({
            title: "❌ Lỗi định giá AI",
            description: aiError,
            variant: "destructive",
          });
          return;
        }
        
        setResult(result as CombinedResult);
        
        // Success notifications
        toast({
          title: "✅ Định giá thành công",
          description: "Phân tích AI hoàn tất",
        });
        
        // Show warning if using mock data
        if (result.error && result.error.includes('mock')) {
          toast({
            title: "⚠️ Thông báo",
            description: "Đang sử dụng dữ liệu mẫu do vấn đề với API thực tế",
            variant: "destructive",
          });
        }
      } else {
        setError(result.error || 'Định giá thất bại');
        toast({
          title: "❌ Lỗi",
          description: result.error || 'Định giá thất bại',
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`);
      console.error('🚨 Valuation error:', error);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error details:', error);
    }
    
    setIsLoading(false);
  }

  return (
    <>
      <Card className="professional-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-slate-800">Thông tin Bất động sản</h3>
              <p className="text-sm text-slate-600 font-normal">Chi tiết tài sản cần định giá</p>
            </div>
          </CardTitle>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* SECTION 1: Loại hình và vị trí BĐS */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Loại hình và vị trí BĐS</h3>
                <div className="space-y-4">
                  {/* Address Field */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Địa chỉ <span className="text-red-500">(*)</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              ref={addressInputRef}
                              placeholder="VD: Số 97 ngõ 90 Láng Hạ" 
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                handleAddressInputChange(e.target.value);
                              }}
                              onFocus={() => field.value.length > 1 && fetchSuggestions(field.value)}
                              className="pr-8"
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
                            
                            {/* Suggestions Dropdown */}
                            {showSuggestions && (
                              <div 
                                ref={suggestionsRef}
                                className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                              >
                                {isLoadingSuggestions ? (
                                  <div className="p-3 text-center">
                                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-500" />
                                  </div>
                                ) : suggestions.length > 0 ? (
                                  <div>
                                    {suggestions.map((suggestion, index) => (
                                      <button
                                        key={suggestion.place_id || index}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b last:border-b-0 text-sm"
                                      >
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                          <span className="truncate">{suggestion.formatted}</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3 text-center text-sm text-gray-500">
                                    Không tìm thấy kết quả
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Type Selection */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Chọn loại hình <span className="text-red-500">(*)</span></FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {propertyTypes.map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => field.onChange(type.value)}
                                className={`p-3 border rounded-lg text-sm transition-all ${
                                  field.value === type.value
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  <span>{type.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Road Width */}
                  <FormField
                    control={form.control}
                    name="roadWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Đường rộng <span className="text-red-500">(*)</span></FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {roadWidthOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => field.onChange(option.value)}
                              className={`p-3 border rounded-lg text-sm transition-all text-left ${
                                field.value === option.value
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{option.label}</span>
                                {option.description && (
                                  <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SECTION 2: Đặc điểm thửa đất */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Đặc điểm thửa đất</h3>
                <div className="space-y-4">
                  {/* Land Area */}
                  <FormField
                    control={form.control}
                    name="landArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Diện tích trên sổ đỏ <span className="text-red-500">(*)</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" placeholder="Nhập số" {...field} className="h-10 pr-8" />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">m²</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Facade Width & House Area */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="facadeWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Mặt tiền</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.1" placeholder="Nhập số" {...field} className="h-10 pr-8" />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">m</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="houseArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Diện tích sàn</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" placeholder="Nhập số" {...field} className="h-10 pr-8" />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">m²</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* House Direction */}
                  <FormField
                    control={form.control}
                    name="houseDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Hướng</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Chọn hướng" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {houseDirectionOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Legal Issues */}
                  <FormField
                    control={form.control}
                    name="legalIssues"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Vấn đề pháp lý</FormLabel>
                        <div className="grid grid-cols-1 gap-2">
                          {legalIssuesOptions.map((option) => (
                            <FormField
                              key={option.value}
                              control={form.control}
                              name="legalIssues"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={option.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        checked={field.value?.includes(option.value) || false}
                                        onChange={(checked) => {
                                          const currentValue = Array.isArray(field.value) ? field.value : [];
                                          if (checked.target.checked) {
                                            field.onChange([...currentValue, option.value]);
                                          } else {
                                            field.onChange(currentValue.filter((value: string) => value !== option.value));
                                          }
                                        }}
                                        className="h-4 w-4 rounded border border-gray-300"
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {option.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Alley Type - Only show for nha_rieng */}
                  {form.watch('type') === 'nha_rieng' && (
                    <FormField
                      control={form.control}
                      name="alleyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Loại ngõ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Chọn loại ngõ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {alleyTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Legal Status & Sổ Shape */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="legal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Pháp lý</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Chọn pháp lý" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {legalOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="soShape"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Hình dáng sổ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Hình dáng lô đất" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {soShapeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4" />
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Giá trị nhà trên đất */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Giá trị nhà trên đất</h3>
                <div className="space-y-4">
                  {/* Building Area */}
                  <FormField
                    control={form.control}
                    name="buildingArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Diện tích xây dựng (Mặt sàn x Số tầng)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" placeholder="Nhập số" {...field} className="h-10 pr-8" />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">m²</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bedrooms with button style */}
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Số phòng ngủ</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => field.onChange(num)}
                              className={`w-10 h-10 rounded-full border text-sm font-medium transition-all ${
                                field.value === num
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                          <Input
                            type="number"
                            placeholder="Nhập số"
                            value={field.value > 5 ? field.value : ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val > 5) field.onChange(val);
                            }}
                            className="w-20 h-10 text-center"
                            min="6"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Stories with button style */}
                  <FormField
                    control={form.control}
                    name="storyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Số tầng</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => field.onChange(num)}
                              className={`w-10 h-10 rounded-full border text-sm font-medium transition-all ${
                                field.value === num
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                          <Input
                            type="number"
                            placeholder="Nhập số"
                            value={field.value > 5 ? field.value : ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val > 5) field.onChange(val);
                            }}
                            className="w-20 h-10 text-center"
                            min="6"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Construction Level */}
                  <FormField
                    control={form.control}
                    name="constructionLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Mức độ xây dựng</FormLabel>
                        <div className="space-y-2">
                          {constructionLevelOptions.map((option) => (
                            <label
                              key={option.value}
                              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                                field.value === option.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                value={option.value}
                                checked={field.value === option.value}
                                onChange={() => field.onChange(option.value)}
                                className="mt-1 mr-3"
                              />
                              <div>
                                <div className="font-medium text-sm">{option.label}</div>
                                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* House Quality */}
                  <FormField
                    control={form.control}
                    name="houseQuality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Chất lượng nhà còn lại</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {houseQualityOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => field.onChange(option.value)}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                field.value === option.value
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bathrooms */}
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Phòng tắm</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Year Built */}
                  <FormField
                    control={form.control}
                    name="yearBuilt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Năm xây dựng</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" placeholder="2015" {...field} className="h-10 pl-10" />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SECTION 4: Bất lợi và ưu điểm */}
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bất lợi và ưu điểm</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Yếu tố bất lợi ảnh hưởng nhiều đến giá nhà, nên để tính giá chính xác, bạn vui lòng thêm các yếu tố trên nếu có
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-gray-600 mb-2"
                        onClick={handleDisadvantagesDialogOpen}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Chọn đặc điểm bất lợi
                      </Button>
                      {/* Show selected disadvantages */}
                      <div className="flex flex-wrap gap-2">
                        {getSelectedDisadvantageLabels().map((label, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-gray-600 mb-2"
                        onClick={handleAdvantagesDialogOpen}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Chọn ưu điểm
                      </Button>
                      {/* Show selected advantages */}
                      <div className="flex flex-wrap gap-2">
                        {getSelectedAdvantageLabels().map((label, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                    <span className="text-white">Đang định giá...</span>
                  </>
                ) : (
                  <>
                    <Home className="mr-2 h-4 w-4 text-white" />
                    <span className="text-white">Định giá bất động sản</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Disadvantages Dialog */}
      <Dialog open={showDisadvantagesDialog} onOpenChange={setShowDisadvantagesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Đặc điểm bất lợi</DialogTitle>
          </DialogHeader>
          <div className="flex h-96">
            {/* Left sidebar - Categories */}
            <div className="w-1/3 border-r border-gray-200 pr-4">
              <ul className="space-y-2">
                {Object.entries(disadvantagesData).map(([key, category]) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelectedDisadvantageCategory(key)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        selectedDisadvantageCategory === key
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {category.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Right content - Options */}
            <div className="w-2/3 pl-4 overflow-y-auto">
              {disadvantagesData[selectedDisadvantageCategory as keyof typeof disadvantagesData] && (
                <div>
                  <h3 className="font-semibold mb-3">
                    {selectedDisadvantageCategory === 'vi_tri' ? 'Gần nơi bất lợi' : 'Vị trí xấu'}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {disadvantagesData[selectedDisadvantageCategory as keyof typeof disadvantagesData].options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleDisadvantageOption(option.value)}
                        className={`p-2 text-left text-sm rounded border transition-colors ${
                          tempDisadvantages.includes(option.value)
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <div className="text-sm text-gray-500">
                Đã chọn: {tempDisadvantages.length} mục
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDisadvantagesReset}>
                  Đặt lại
                </Button>
                <Button onClick={handleDisadvantagesApply}>
                  Áp dụng
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advantages Dialog */}
      <Dialog open={showAdvantagesDialog} onOpenChange={setShowAdvantagesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Chọn ưu điểm</DialogTitle>
          </DialogHeader>
          <div className="flex h-96">
            {/* Left sidebar - Categories */}
            <div className="w-1/3 border-r border-gray-200 pr-4">
              <ul className="space-y-2">
                {Object.entries(advantagesData).map(([key, category]) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelectedAdvantageCategory(key)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        selectedAdvantageCategory === key
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {category.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Right content - Options */}
            <div className="w-2/3 pl-4 overflow-y-auto">
              {advantagesData[selectedAdvantageCategory as keyof typeof advantagesData] && (
                <div>
                  <div className="grid grid-cols-1 gap-2">
                    {advantagesData[selectedAdvantageCategory as keyof typeof advantagesData].options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleAdvantageOption(option.value)}
                        className={`p-2 text-left text-sm rounded border transition-colors ${
                          tempAdvantages.includes(option.value)
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <div className="text-sm text-gray-500">
                Đã chọn: {tempAdvantages.length} mục
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleAdvantagesReset}>
                  Đặt lại
                </Button>
                <Button onClick={handleAdvantagesApply}>
                  Áp dụng
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
