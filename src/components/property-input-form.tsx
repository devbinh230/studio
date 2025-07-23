"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { CombinedResult } from "@/lib/types";
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
  Plus,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getDefaultAuthToken,
  getGeoapifyApiKey,
} from "@/lib/config";
import { preparePlanningAnalysisData } from '@/lib/planning-utils';

const formSchema = z.object({
  address: z.string().min(5, "Vui lòng nhập địa chỉ hợp lệ."),
  type: z.enum(
    [
      "nha_trong_hem",
      "nha_pho",
      "biet_thu",
      "dat_nen",
      "dat",
      "dat_nen_du_an",
      "can_ho_chung_cu",
      "lien_ke",
    ],
    {
      required_error: "Vui lòng chọn loại bất động sản.",
    }
  ),
  roadWidth: z.enum(
    [
      "ngo_ngach",
      "ngo_oto_do_cua",
      "ngo_1_oto",
      "ngo_2_oto_tranh",
      "ngo_3_oto_tranh",
      "ngo_4_oto_tranh",
      "ngo_4_oto_tro_len",
      "mat_pho",
    ],
    {
      required_error: "Vui lòng chọn đường rộng.",
    }
  ),
  houseArea: z.coerce.number().min(10, "Diện tích sàn phải lớn hơn 10m²."),
  landArea: z.coerce.number().min(10, "Diện tích đất phải lớn hơn 10m²."),
  facadeWidth: z.coerce
    .number()
    .min(1, "Chiều rộng mặt tiền phải lớn hơn 1m.")
    .optional(),
  buildingArea: z.coerce
    .number()
    .min(10, "Diện tích xây dựng phải lớn hơn 10m².")
    .optional(),
  storyNumber: z.coerce.number().min(1, "Phải có ít nhất 1 tầng."),
  bedrooms: z.coerce.number().min(1, "Phải có ít nhất 1 phòng ngủ."),
  bathrooms: z.coerce.number().min(1, "Phải có ít nhất 1 phòng tắm."),
  legal: z.enum(["contract", "white_book", "pink_book", "red_book"], {
    required_error: "Vui lòng chọn tình trạng pháp lý.",
  }),
  legalIssues: z
    .array(
      z.enum([
        "xay_lan_hang_xom",
        "so_chung_tranh_chap",
        "giay_to_viet_tay",
        "dinh_quy_hoach",
      ])
    )
    .optional(),
  yearBuilt: z.coerce
    .number()
    .min(1900, "Năm xây dựng phải từ 1900 trở lên.")
    .max(
      new Date().getFullYear(),
      `Năm xây dựng không thể lớn hơn ${new Date().getFullYear()}.`
    )
    .optional(),
  alleyType: z
    .enum(["thong", "cut"], {
      required_error: "Vui lòng chọn loại ngõ.",
    })
    .optional(),
  houseDirection: z
    .enum(["dong", "tay", "nam", "bac"], {
      required_error: "Vui lòng chọn hướng nhà.",
    })
    .optional(),
  soShape: z
    .enum(["vuong", "no_hau", "thop_hau", "phuc_tap"], {
      required_error: "Vui lòng chọn hình dáng sổ.",
    })
    .optional(),
  constructionLevel: z
    .enum(
      ["noi_that_co_ban", "noi_that_cao_cap", "xay_tho", "noi_that_day_du"],
      {
        required_error: "Vui lòng chọn mức độ xây dựng.",
      }
    )
    .optional(),
  houseQuality: z
    .enum(["30", "40", "50", "60", "70", "80", "90", "100"], {
      required_error: "Vui lòng chọn chất lượng nhà còn lại.",
    })
    .optional(),
  disadvantages: z.array(z.string()).optional(),
  advantages: z.array(z.string()).optional(),
});

// Property type options with Vietnamese labels - Updated based on HTML
const propertyTypes = [
  { value: "nha_trong_hem", label: "Nhà trong hẻm", icon: Home },
  { value: "nha_pho", label: "Nhà phố", icon: Building },
  { value: "biet_thu", label: "Biệt thự", icon: TreeDeciduous },
  { value: "dat_nen", label: "Đất nền", icon: Square },
  { value: "dat", label: "Đất", icon: Square },
  { value: "dat_nen_du_an", label: "Đất nền dự án", icon: Square },
  { value: "can_ho_chung_cu", label: "Căn hộ chung cư", icon: Building },
  { value: "lien_ke", label: "Liền kề", icon: Home },
] as const;

// Road width options based on HTML
const roadWidthOptions = [
  {
    value: "ngo_4_oto_tro_len",
    label: "Ngõ 4 ô tô trở lên",
    description: "(>11m)",
  },
  {
    value: "ngo_4_oto_tranh",
    label: "Ngõ 4 ô tô tránh",
    description: "(9-11m)",
  },
  {
    value: "ngo_3_oto_tranh",
    label: "Ngõ 3 ô tô tránh",
    description: "(7-9m)",
  },
  {
    value: "ngo_2_oto_tranh",
    label: "Ngõ 2 ô tô tránh",
    description: "(5-7m)",
  },
  { value: "ngo_1_oto", label: "Ngõ 1 ô tô", description: "(2,5-5m)" },
  { value: "ngo_oto_do_cua", label: "Ngõ ô tô đỗ cửa", description: "" },
  { value: "ngo_ngach", label: "Ngõ ngách", description: "(< 2,5m)" },
  { value: "mat_pho", label: "Mặt phố - Mặt đường", description: "" },
] as const;

// Legal issues options
const legalIssuesOptions = [
  { value: "xay_lan_hang_xom", label: "Xây lấn hàng xóm/ Hàng xóm xây lấn" },
  { value: "so_chung_tranh_chap", label: "Sổ chung, tranh chấp quyền sử dụng" },
  { value: "giay_to_viet_tay", label: "Giấy tờ viết tay" },
  { value: "dinh_quy_hoach", label: "Dính quy hoạch 1 phần" },
] as const;

// Construction level options
const constructionLevelOptions = [
  {
    value: "noi_that_co_ban",
    label: "Nội thất cơ bản",
    description: "Đã có kệ bếp, tiện ích cơ bản nhà tắm/ vệ sinh...",
  },
  {
    value: "noi_that_cao_cap",
    label: "Nội thất cao cấp",
    description: "Nội thất đầy đủ, có mức độ đầu tư cao về giá trị.",
  },
  {
    value: "xay_tho",
    label: "Xây thô",
    description: "Chưa có nội thất, nhà mới chỉ bàn giao thô.",
  },
  {
    value: "noi_that_day_du",
    label: "Nội thất đầy đủ",
    description:
      "Nội thất đã hoàn thiện đầy đủ, mức độ giá trị nội thất ở tầm trung.",
  },
] as const;

// House quality options
const houseQualityOptions = [
  { value: "30", label: "30%" },
  { value: "40", label: "40%" },
  { value: "50", label: "50%" },
  { value: "60", label: "60%" },
  { value: "70", label: "70%" },
  { value: "80", label: "80%" },
  { value: "90", label: "90%" },
  { value: "100", label: "100%" },
] as const;

// Disadvantages data structure
const disadvantagesData = {
  hinh_dang: {
    title: "Đặc điểm hình dáng",
    options: [
      { value: "thop_hau_hinh", label: "Thóp hậu" },
      { value: "meo_chu_l", label: "Méo chữ L" },
      { value: "nhieu_nep_gap", label: "Nhiều nếp gấp" },
      { value: "mat_tien_vat", label: "Mặt tiền vát" },
      { value: "giau_mat_tien", label: "Giấu mặt tiền" },
      { value: "hau_vat", label: "Hậu vát" },
      { value: "hinh_binh_hanh", label: "Hình bình hành" },
      { value: "nen_cao_hon_duong", label: "Nền quá cao hơn đường" },
      {
        value: "han_che_chieu_cao",
        label: "Hạn chế chiều cao - vành đai xanh",
      },
    ],
  },
  dac_diem_vi_tri: {
    title: "Đặc điểm vị trí",
    options: [
      { value: "thop_hau_vi_tri", label: "Thóp hậu" },
      { value: "meo_chu_l_vi_tri", label: "Méo chữ L" },
      { value: "nhieu_nep_gap_vi_tri", label: "Nhiều nếp gấp" },
      { value: "mat_tien_vat_vi_tri", label: "Mặt tiền vát" },
      { value: "giau_mat_tien_vi_tri", label: "Giấu mặt tiền" },
      { value: "hau_vat_vi_tri", label: "Hậu vát" },
      { value: "hinh_binh_hanh_vi_tri", label: "Hình bình hành" },
      { value: "nen_cao_hon_duong_vi_tri", label: "Nền quá cao hơn đường" },
      {
        value: "han_che_chieu_cao_vi_tri",
        label: "Hạn chế chiều cao - vành đai xanh",
      },
    ],
  },
  vi_tri: {
    title: "Đặc điểm vị trí",
    options: [
      { value: "gan_cho_bua", label: "Chợ búa" },
      { value: "cong_lap", label: "Cống lấp (trên cống/ cống trước cửa)" },
      { value: "cong_thoi", label: "Cống thối (trên cống/ cống trước cửa)" },
      { value: "gan_duong_cao_toc", label: "Gần đường cao tốc <30m" },
      { value: "gan_cong_thoi", label: "Gần cống thối" },
      { value: "chan_cau_vuot", label: "Chân cầu vượt" },
      { value: "tram_dung_xe_bus", label: "Trạm dừng xe bus" },
      { value: "chan_cau_di_bo", label: "Chân cầu đi bộ" },
      { value: "canh_nha_may", label: "Cạnh/gần nhà máy" },
      { value: "doi_dien_toa_an", label: "Đối diện tòa án doanh trại công an" },
      { value: "cau_vuot_tren_cao", label: "Cầu vượt trên cao" },
      { value: "gan_nha_nghi", label: "Gần nhà nghỉ" },
      {
        value: "giap_truong_hoc",
        label: "Giáp trường học - xí nghiệp - tập thể chung",
      },
      { value: "gan_benh_vien", label: "Gần hoặc giáp bệnh viện dưới 50m" },
      { value: "sau_nha_hang", label: "Sau nhà hàng - bị mùi - rác thải" },
      { value: "cuoi_ngo", label: "Cuối ngõ" },
      { value: "khe_dam", label: "Khe đâm" },
      { value: "ngo_cut", label: "Ngõ cụt" },
      { value: "tren_doc", label: "Trên dốc" },
      { value: "duong_gom", label: "Đường gom" },
      { value: "bazie", label: "Bazie" },
      {
        value: "tru_dien",
        label: "Trụ điện - bốt điện - trạm điện - cột điện",
      },
      { value: "khong_co_he", label: "Không có hè - hè bé dưới 1m" },
      { value: "cong_chung", label: "Cổng chung" },
      { value: "dan_tri_thap", label: "Dân trí thấp" },
      { value: "cam_oto", label: "Cấm ô tô" },
      { value: "cam_de_xe", label: "Cấm để xe vỉa hè" },
      { value: "duong_1_chieu", label: "Đường 1 chiều" },
      { value: "oto_1_chieu", label: "Ô tô 1 chiều" },
      { value: "ngo_xau", label: "Ngõ xấu - lộn xộn - ngoằn ngoèo" },
      { value: "he_doc_cao", label: "Hè dốc cao" },
      { value: "trung_nuoc", label: "Trũng nước ngập" },
      { value: "vi_tri_toi", label: "Vị trí tối- khu âm u - khuất" },
      { value: "duong_thuc_dit", label: "Đường thúc đít" },
      { value: "hay_tac_duong", label: "Hay tắc đường" },
      { value: "bi_cat_mat_do", label: "Bị cắt mật độ - không xây hết đất" },
      { value: "duong_bo_dan_cu", label: "Đường bo dân cư - khu đô thị" },
      {
        value: "truc_ngang",
        label: "Trục ngang - Đường phụ (Cho thuê giá thấp - ít người qua lại)",
      },
      { value: "qua_duong_tau", label: "Qua đường tàu" },
      { value: "duong_dam", label: "Đường đâm" },
    ],
  },
  tam_linh: {
    title: "Đặc điểm Tâm Linh",
    options: [
      {
        value: "gan_dinh_chua",
        label: "Gần/ giáp đình chùa nghĩa trang nhà thờ",
      },
      { value: "cay", label: "Cây" },
      { value: "dat_den_chua", label: "Tâm linh (đất đền chùa/ nghĩa trang)" },
      { value: "dat_du", label: "Đất dữ (ốm đau, bệnh tật, tự tử, ..)" },
    ],
  },
  quy_hoach: {
    title: "Quy hoạch và pháp lý",
    options: [
      { value: "tranh_chap_gia_dinh", label: "Tranh chấp gia đình" },
      { value: "tranh_chap_xung_quanh", label: "Tranh chấp xung quanh" },
      { value: "so_lon_hon_thuc_te", label: "Sổ lớn hơn thực tế" },
      { value: "thuc_te_lon_hon_so", label: "Thực tế lớn hơn sổ" },
      {
        value: "giao_dich_qua_ben_thu_3",
        label:
          "Giao dịch qua bên thứ 3 (người nhà, ngân hàng, văn phòng công chứng)",
      },
      { value: "hop_dong_mua_ban", label: "Hợp đồng mua bán" },
      { value: "hop_dong_gop_von", label: "Hợp đồng góp vốn" },
      { value: "hop_dong_uy_quyen", label: "Hợp đồng Uỷ quyền" },
      {
        value: "giay_to_chung_minh_nguon_goc",
        label: "Giấy tờ chứng minh nguồn gốc",
      },
      { value: "chua_lam_giay_cn_qsdd", label: "Chưa làm giấy CN QSĐD" },
      { value: "dang_lam_giay_cn_qsdd", label: "Đang làm giấy CN QSĐD" },
      { value: "da_co_giay_hen_lay_so", label: "Đã có giấy hẹn lấy sổ" },
      { value: "sang_nhuong_doanh_nghiep", label: "Sang nhượng doanh nghiệp" },
      { value: "mua_ban_co_phan", label: "Mua bán cổ phần" },
      { value: "hop_tac_dau_tu", label: "Hợp tác đầu tư" },
      { value: "viet_tay", label: "Viết tay" },
    ],
  },
};

// Advantages data structure
const advantagesData = {
  hinh_dang_xay_dung: {
    title: "Đặc điểm hình dáng, xây dựng",
    options: [
      { value: "co_tang_ham", label: "Có tầng hầm" },
      { value: "dua_duoc_rong", label: "Đua được rộng thêm 1m" },
      { value: "dat_vuong", label: "Đất vuông" },
      { value: "dat_no_hau", label: "Đất nở hậu" },
      { value: "chac_chan_xay_cao", label: "Chắc chắn xây cao trên 6 tầng" },
    ],
  },
  vi_tri: {
    title: "Đặc điểm vị trí",
    options: [
      { value: "gan_truong_hoc", label: "Gần trường học" },
      { value: "gan_benh_vien_tot", label: "Gần bệnh viện lớn" },
      { value: "gan_cho_lon", label: "Gần chợ lớn" },
      { value: "gan_cong_vien", label: "Gần công viên" },
      { value: "gan_trung_tam_thuong_mai", label: "Gần trung tâm thương mại" },
      { value: "gan_ben_xe_bus", label: "Gần bến xe bus" },
      { value: "gan_ga_metro", label: "Gần ga metro" },
      { value: "khu_dan_cu_cao_cap", label: "Khu dân cư cao cấp" },
      { value: "mat_duong_lon", label: "Mặt đường lớn" },
      { value: "giao_thong_thuan_tien", label: "Giao thông thuận tiện" },
    ],
  },
  quy_hoach: {
    title: "Quy hoạch và pháp lý",
    options: [
      {
        value: "ra_mat_duong_sau_quy_hoach",
        label: "Ra mặt đường sau quy hoạch",
      },
      { value: "dang_co_hop_dong_thue", label: "Đang có hợp đồng thuê" },
      { value: "da_co_giay_phep_xay_dung", label: "Đã có giấy phép xây dựng" },
      { value: "dat_dau_gia", label: "Đất đấu giá" },
    ],
  },
};

// Legal status options with Vietnamese labels
const legalOptions = [
  { value: "red_book", label: "Sổ đỏ" },
  { value: "pink_book", label: "Sổ hồng" },
  { value: "white_book", label: "Sổ trắng" },
  { value: "contract", label: "Hợp đồng" },
] as const;

// Alley type options with Vietnamese labels
const alleyTypeOptions = [
  { value: "thong", label: "Ngõ thông" },
  { value: "cut", label: "Ngõ cụt" },
] as const;

// House direction options with Vietnamese labels
const houseDirectionOptions = [
  { value: "dong", label: "Đông" },
  { value: "tay", label: "Tây" },
  { value: "nam", label: "Nam" },
  { value: "bac", label: "Bắc" },
] as const;

// Sổ shape options
const soShapeOptions = [
  { value: "vuong", label: "Sổ vuông" },
  { value: "no_hau", label: "Nở hậu" },
  { value: "thop_hau", label: "Thóp hậu" },
  { value: "phuc_tap", label: "Phức tạp" },
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

// Add code to get planning data
async function getPlanningData(lat: number, lng: number) {
  try {
    console.log('🗺️ Getting planning data for coordinates:', lat, lng);
    const planningData = await preparePlanningAnalysisData(lat, lng);
    console.log('✅ Planning data prepared:', planningData);
    return planningData;
  } catch (error) {
    console.error('Error getting planning data:', error);
    return null;
  }
}

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
  const [selectedDisadvantageCategory, setSelectedDisadvantageCategory] =
    useState("vi_tri");
  const [selectedAdvantageCategory, setSelectedAdvantageCategory] =
    useState("hinh_dang_xay_dung");
  const [tempDisadvantages, setTempDisadvantages] = useState<string[]>([]);
  const [tempAdvantages, setTempAdvantages] = useState<string[]>([]);

  // Toggle to show/hide all optional (nâng cao) fields in form
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Scroll refs for selected items navigation
  const disadvantagesScrollRef = useRef<HTMLDivElement>(null);
  const advantagesScrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address:
        "21°01'41.9\"N 105°51'14.4\"E, Phường Lý Thái Tổ, Quận Hoàn Kiếm, Hà Nội",
      type: "nha_trong_hem",
      roadWidth: "ngo_1_oto",
      houseArea: 33,
      landArea: 33,
      facadeWidth: 3,
      buildingArea: 33,
      storyNumber: 4,
      bedrooms: 3,
      bathrooms: 2,
      legal: "contract",
      legalIssues: [],
      yearBuilt: 2015,
      alleyType: "thong",
      houseDirection: "nam",
      soShape: "vuong",
      constructionLevel: "noi_that_co_ban",
      houseQuality: "80",
      disadvantages: [],
      advantages: [],
    },
  });

  // Auto-fill address when location is selected from map
  useEffect(() => {
    if (selectedLocation?.address) {
      form.setValue("address", selectedLocation.address);
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          query
        )}&lang=vi&limit=5&bias=countrycode:vn&apiKey=${getGeoapifyApiKey()}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const suggestionsList: SearchSuggestion[] = data.features.map(
          (feature: any) => ({
            formatted:
              feature.properties.formatted ||
              feature.properties.address_line1 ||
              "",
            lat: feature.properties.lat,
            lon: feature.properties.lon,
            place_id: feature.properties.place_id || Math.random().toString(),
            address_line1: feature.properties.address_line1,
            address_line2: feature.properties.address_line2,
            category: feature.properties.category,
          })
        );

        setSuggestions(suggestionsList);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };
  
  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    form.setValue("address", suggestion.formatted);
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
    form.setValue("address", value);

    const timeoutId = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const clearAddressInput = () => {
    form.setValue("address", "");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Dialog handlers
  const handleDisadvantagesDialogOpen = () => {
    setTempDisadvantages(form.getValues("disadvantages") || []);
    setShowDisadvantagesDialog(true);
  };

  const handleAdvantagesDialogOpen = () => {
    setTempAdvantages(form.getValues("advantages") || []);
    setShowAdvantagesDialog(true);
  };

  const handleDisadvantagesApply = () => {
    form.setValue("disadvantages", tempDisadvantages);
    setShowDisadvantagesDialog(false);
  };

  const handleAdvantagesApply = () => {
    form.setValue("advantages", tempAdvantages);
    setShowAdvantagesDialog(false);
  };

  const handleDisadvantagesReset = () => {
    setTempDisadvantages([]);
  };

  const handleAdvantagesReset = () => {
    setTempAdvantages([]);
  };

  const toggleDisadvantageOption = (value: string) => {
    setTempDisadvantages((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const toggleAdvantageOption = (value: string) => {
    setTempAdvantages((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const getSelectedDisadvantageLabels = () => {
    const selected = form.getValues("disadvantages") || [];
    return selected.map((value) => {
      for (const category of Object.values(disadvantagesData)) {
        const option = category.options.find((opt) => opt.value === value);
        if (option) return option.label;
      }
      return value;
    });
  };

  const getSelectedAdvantageLabels = () => {
    const selected = form.getValues("advantages") || [];
    return selected.map((value) => {
      for (const category of Object.values(advantagesData)) {
        const option = category.options.find((opt) => opt.value === value);
        if (option) return option.label;
      }
      return value;
    });
  };

  // Scroll functions for selected items navigation
  const scrollDisadvantagesLeft = () => {
    if (disadvantagesScrollRef.current) {
      disadvantagesScrollRef.current.scrollBy({
        left: -200,
        behavior: "smooth",
      });
    }
  };

  const scrollDisadvantagesRight = () => {
    if (disadvantagesScrollRef.current) {
      disadvantagesScrollRef.current.scrollBy({
        left: 200,
        behavior: "smooth",
      });
    }
  };

  const scrollAdvantagesLeft = () => {
    if (advantagesScrollRef.current) {
      advantagesScrollRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollAdvantagesRight = () => {
    if (advantagesScrollRef.current) {
      advantagesScrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!selectedLocation?.latitude || !selectedLocation?.longitude) {
        toast({
          title: 'Location Required',
          description: 'Please select a location on the map',
          variant: 'destructive',
        });
        return;
      }

      const authToken = getDefaultAuthToken();

      // Get planning data
      let planningData = null;
      try {
        console.log('🗺️ Preparing planning data for analysis...');
        planningData = await getPlanningData(
          selectedLocation.latitude,
          selectedLocation.longitude
        );
        console.log('✅ Planning data prepared:', planningData);
      } catch (planningError) {
        console.warn('⚠️ Error preparing planning data:', planningError);
        // Continue without planning data if preparation fails
      }

      const payload = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        property_details: {
          type: values.type,
          landArea: parseFloat(values.landArea),
          houseArea: parseFloat(values.houseArea),
          roadWidth: parseFloat(values.roadWidth),
          facadeWidth: parseFloat(values.facadeWidth),
          buildingArea: parseFloat(values.buildingArea),
          storyNumber: parseInt(values.storyNumber),
          bedRoom: parseInt(values.bedrooms),
          bathRoom: parseInt(values.bathrooms),
          legal: values.legal,
          legalIssues: values.legalIssues,
          yearBuilt: parseInt(values.yearBuilt),
          alleyType: values.alleyType,
          houseDirection: values.houseDirection,
          soShape: values.soShape,
          constructionLevel: values.constructionLevel,
          houseQuality: values.houseQuality,
          disadvantages: values.disadvantages,
          advantages: values.advantages,
        },
        planning_data: planningData,
        auth_token: authToken,
      };

      // Debug logging for payload
      console.log("📤 Sending payload:", payload);

      const response = await fetch("/api/complete-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Debug logging
      console.log("🔍 API Response:", result);
      console.log("🔍 AI Valuation exists:", !!result.ai_valuation);
      console.log("🔍 Error:", result.error);

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
          const aiError = "AI Valuation không thành công - vui lòng thử lại";
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
        if (result.error && result.error.includes("mock")) {
          toast({
            title: "⚠️ Thông báo",
            description: "Đang sử dụng dữ liệu mẫu do vấn đề với API thực tế",
            variant: "destructive",
          });
        }
      } else {
        setError(result.error || "Định giá thất bại");
        toast({
          title: "❌ Lỗi",
          description: result.error || "Định giá thất bại",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Đã xảy ra lỗi không mong muốn: ${errorMessage}`);
      console.error("🚨 Valuation error:", error);
      console.error("🚨 Error type:", typeof error);
      console.error("🚨 Error details:", error);
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
              <p className="text-sm text-slate-600 font-normal">
                Chi tiết tài sản cần định giá
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* SECTION 1: Loại hình và vị trí BĐS */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Loại hình và vị trí BĐS
                </h3>
                <div className="space-y-4">
                  {/* Address Field */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Địa chỉ <span className="text-red-500">(*)</span>
                        </FormLabel>
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
                              onFocus={() =>
                                field.value.length > 1 &&
                                fetchSuggestions(field.value)
                              }
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
                                        onClick={() =>
                                          handleSuggestionClick(suggestion)
                                        }
                                        className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b last:border-b-0 text-sm"
                                      >
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                          <span className="truncate">
                                            {suggestion.formatted}
                                          </span>
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

                  {/* Type Selection (dropdown) */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Chọn loại hình{" "}
                          <span className="text-red-500">(*)</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Chọn loại hình" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {propertyTypes.map((type) => {
                              const IconComponent = type.icon;
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    <span>{type.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Road Width (dropdown) */}
                  <FormField
                    control={form.control}
                    name="roadWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Đường rộng <span className="text-red-500">(*)</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Chọn độ rộng" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roadWidthOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className="flex flex-col text-sm">
                                  <span className="font-medium">
                                    {option.label}
                                  </span>
                                  {option.description && (
                                    <span className="text-xs text-gray-500">
                                      {option.description}
                                    </span>
                                  )}
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

              {/* SECTION 2: Đặc điểm thửa đất */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Đặc điểm thửa đất
                </h3>
                <div className="space-y-4">
                  {/* Land / Facade / House Area grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Diện tích sổ */}
                    <FormField
                      control={form.control}
                      name="landArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Diện tích sổ đỏ{" "}
                            <span className="text-red-500">(*)</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Nhập số"
                                {...field}
                                className="h-10 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                m²
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Mặt tiền (optional) */}
                    {showAdvanced && (
                      <FormField
                        control={form.control}
                        name="facadeWidth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Mặt tiền
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Nhập số"
                                  {...field}
                                  className="h-10 pr-8"
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                  m
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Diện tích sàn */}
                    <FormField
                      control={form.control}
                      name="houseArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Diện tích sàn{" "}
                            <span className="text-red-500">(*)</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Nhập số"
                                {...field}
                                className="h-10 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                m²
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Spacer when advanced hidden */}
                  {!showAdvanced && <div className="h-4"></div>}

                  {/* House Direction (optional) */}
                  {showAdvanced && (
                    <FormField
                      control={form.control}
                      name="houseDirection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Hướng
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Chọn hướng" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {houseDirectionOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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

                  {/* Legal Issues (optional) */}
                  {showAdvanced && (
                    <FormField
                      control={form.control}
                      name="legalIssues"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Vấn đề pháp lý
                          </FormLabel>
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
                                          checked={
                                            field.value?.includes(
                                              option.value
                                            ) || false
                                          }
                                          onChange={(checked) => {
                                            const currentValue = Array.isArray(
                                              field.value
                                            )
                                              ? field.value
                                              : [];
                                            if (checked.target.checked) {
                                              field.onChange([
                                                ...currentValue,
                                                option.value,
                                              ]);
                                            } else {
                                              field.onChange(
                                                currentValue.filter(
                                                  (value: string) =>
                                                    value !== option.value
                                                )
                                              );
                                            }
                                          }}
                                          className="h-4 w-4 rounded border border-gray-300"
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {option.label}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Alley Type (optional) - Only show for nha_trong_hem */}
                  {showAdvanced && form.watch("type") === "nha_trong_hem" && (
                    <FormField
                      control={form.control}
                      name="alleyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Loại ngõ
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Chọn loại ngõ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {alleyTypeOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="legal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Pháp lý <span className="text-red-500">(*)</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Chọn pháp lý" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {legalOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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

                    {showAdvanced && (
                      <FormField
                        control={form.control}
                        name="soShape"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Hình dáng sổ
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Hình dáng lô đất" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {soShapeOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
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
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Giá trị nhà trên đất */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Giá trị nhà trên đất
                </h3>
                <div className="space-y-4">
                  {/* Building Area (optional) */}
                  {showAdvanced && (
                    <FormField
                      control={form.control}
                      name="buildingArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Diện tích xây dựng (Mặt sàn x Số tầng)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Nhập số"
                                {...field}
                                className="h-10 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                m²
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Bedrooms, Story Number, Bathrooms */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Bedrooms */}
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Số phòng ngủ{" "}
                            <span className="text-red-500">(*)</span>
                          </FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => field.onChange(num)}
                                className={`w-10 h-10 rounded-full border text-sm font-medium transition-all ${
                                  field.value === num
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                            <Input
                              type="number"
                              placeholder="Nhập số"
                              value={field.value > 5 ? field.value : ""}
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

                    {/* Story number */}
                    <FormField
                      control={form.control}
                      name="storyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Số tầng <span className="text-red-500">(*)</span>
                          </FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => field.onChange(num)}
                                className={`w-10 h-10 rounded-full border text-sm font-medium transition-all ${
                                  field.value === num
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                            <Input
                              type="number"
                              placeholder="Nhập số"
                              value={field.value > 5 ? field.value : ""}
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

                    {/* Bathrooms */}
                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Phòng tắm <span className="text-red-500">(*)</span>
                          </FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => field.onChange(num)}
                                className={`w-10 h-10 rounded-full border text-sm font-medium transition-all ${
                                  (field.value ?? 0) === num
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                            <Input
                              type="number"
                              placeholder="Nhập số"
                              value={(field.value ?? 0) > 5 ? field.value : ""}
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
                  </div>

                  {/* Construction Level (optional) */}
                  {showAdvanced && (
                    <FormField
                      control={form.control}
                      name="constructionLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Mức độ xây dựng
                          </FormLabel>
                          <div className="space-y-2">
                            {constructionLevelOptions.map((option) => (
                              <label
                                key={option.value}
                                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                                  field.value === option.value
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
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
                                  <div className="font-medium text-sm">
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {option.description}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* House Quality (optional) */}
                  {showAdvanced && (
                    <FormField
                      control={form.control}
                      name="houseQuality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Chất lượng nhà còn lại
                          </FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {houseQualityOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => field.onChange(option.value)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                  field.value === option.value
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
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
                  )}

                  {/* Year Built (optional) */}
                  {showAdvanced && (
                    <FormField
                      control={form.control}
                      name="yearBuilt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Năm xây dựng
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="2015"
                                {...field}
                                className="h-10 pl-10"
                              />
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* SECTION 4: Bất lợi và ưu điểm (hiển thị khi nâng cao) */}
              {showAdvanced && (
                <div className="pb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Bất lợi và ưu điểm
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Yếu tố bất lợi ảnh hưởng nhiều đến giá nhà, nên để tính
                      giá chính xác, bạn vui lòng thêm các yếu tố trên nếu có
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
                          {getSelectedDisadvantageLabels().map(
                            (label, index) => (
                              <Badge
                                key={index}
                                variant="destructive"
                                className="text-xs"
                              >
                                {label}
                              </Badge>
                            )
                          )}
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
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Global advanced toggle button at bottom */}
              {!showAdvanced && (
                <div className="flex justify-start mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-500 text-blue-700 hover:bg-blue-50 gap-2"
                    onClick={() => setShowAdvanced(true)}
                  >
                    <Sliders className="h-4 w-4" />
                    Thêm trường nâng cao
                  </Button>
                </div>
              )}
              {showAdvanced && (
                <div className="flex justify-start mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-500 text-blue-700 hover:bg-blue-50 gap-2"
                    onClick={() => setShowAdvanced(false)}
                  >
                    Ẩn bớt trường nâng cao
                  </Button>
                </div>
              )}
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
      <Dialog
        open={showDisadvantagesDialog}
        onOpenChange={setShowDisadvantagesDialog}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <X className="h-4 w-4 text-red-600" />
              </div>
              Chọn đặc điểm bất lợi
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Chọn các yếu tố bất lợi có thể ảnh hưởng đến giá trị bất động sản
            </p>
          </DialogHeader>

          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left sidebar - Categories */}
            <div className="w-1/4 space-y-2">
              <h4 className="font-medium text-gray-700 mb-3">Danh mục</h4>
              {Object.entries(disadvantagesData).map(([key, category]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDisadvantageCategory(key)}
                  className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedDisadvantageCategory === key
                      ? "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-2 border-red-200 shadow-sm"
                      : "bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedDisadvantageCategory === key
                          ? "bg-red-500"
                          : "bg-gray-300"
                      }`}
                    />
                    {category.title}
                  </div>
                </button>
              ))}
            </div>

            {/* Right content - Options */}
            <div className="flex-1 overflow-y-auto">
              {disadvantagesData[
                selectedDisadvantageCategory as keyof typeof disadvantagesData
              ] && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {
                        disadvantagesData[
                          selectedDisadvantageCategory as keyof typeof disadvantagesData
                        ].title
                      }
                    </h4>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {
                        disadvantagesData[
                          selectedDisadvantageCategory as keyof typeof disadvantagesData
                        ].options.length
                      }{" "}
                      tùy chọn
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {disadvantagesData[
                      selectedDisadvantageCategory as keyof typeof disadvantagesData
                    ].options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleDisadvantageOption(option.value)}
                        className={`group relative p-4 text-left text-sm rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                          tempDisadvantages.includes(option.value)
                            ? "bg-gradient-to-br from-red-50 to-red-100 border-red-300 text-red-800 shadow-sm"
                            : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                              tempDisadvantages.includes(option.value)
                                ? "bg-red-500 border-red-500"
                                : "border-gray-300 group-hover:border-red-300"
                            }`}
                          >
                            {tempDisadvantages.includes(option.value) && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="font-medium leading-tight">
                            {option.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Items Bar - Max 60% of modal height */}
          {tempDisadvantages.length > 0 && (
            <div className="border-t bg-gray-50 p-4 flex-shrink-0 max-h-[60vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h5 className="font-medium text-gray-700 text-sm">
                  Các mục đã chọn ({tempDisadvantages.length})
                </h5>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={scrollDisadvantagesLeft}
                    className="w-6 h-6 bg-white hover:bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={scrollDisadvantagesRight}
                    className="w-6 h-6 bg-white hover:bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>
              <div
                ref={disadvantagesScrollRef}
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth flex-1 min-h-0"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {tempDisadvantages.map((value) => {
                  const option = Object.values(disadvantagesData)
                    .flatMap((category) => category.options)
                    .find((opt) => opt.value === value);
                  return option ? (
                    <div
                      key={value}
                      className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-red-200 flex-shrink-0"
                    >
                      <span className="font-medium">{option.label}</span>
                      <button
                        type="button"
                        onClick={() => toggleDisadvantageOption(value)}
                        className="w-4 h-4 bg-red-200 hover:bg-red-300 rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-red-600" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600">
                      {tempDisadvantages.length}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {tempDisadvantages.length === 0
                      ? "Chưa chọn mục nào"
                      : tempDisadvantages.length === 1
                      ? "Đã chọn 1 mục"
                      : `Đã chọn ${tempDisadvantages.length} mục`}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleDisadvantagesReset}
                  className="px-6"
                >
                  Đặt lại
                </Button>
                <Button
                  onClick={handleDisadvantagesApply}
                  className="px-6 bg-red-600 hover:bg-red-700"
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advantages Dialog */}
      <Dialog
        open={showAdvantagesDialog}
        onOpenChange={setShowAdvantagesDialog}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Plus className="h-4 w-4 text-green-600" />
              </div>
              Chọn ưu điểm nổi bật
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Chọn các yếu tố tích cực có thể tăng giá trị bất động sản
            </p>
          </DialogHeader>

          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left sidebar - Categories */}
            <div className="w-1/4 space-y-2">
              <h4 className="font-medium text-gray-700 mb-3">Danh mục</h4>
              {Object.entries(advantagesData).map(([key, category]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedAdvantageCategory(key)}
                  className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedAdvantageCategory === key
                      ? "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-2 border-green-200 shadow-sm"
                      : "bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedAdvantageCategory === key
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    {category.title}
                  </div>
                </button>
              ))}
            </div>

            {/* Right content - Options */}
            <div className="flex-1 overflow-y-auto">
              {advantagesData[
                selectedAdvantageCategory as keyof typeof advantagesData
              ] && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {
                        advantagesData[
                          selectedAdvantageCategory as keyof typeof advantagesData
                        ].title
                      }
                    </h4>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {
                        advantagesData[
                          selectedAdvantageCategory as keyof typeof advantagesData
                        ].options.length
                      }{" "}
                      tùy chọn
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {advantagesData[
                      selectedAdvantageCategory as keyof typeof advantagesData
                    ].options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleAdvantageOption(option.value)}
                        className={`group relative p-4 text-left text-sm rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                          tempAdvantages.includes(option.value)
                            ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300 text-green-800 shadow-sm"
                            : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                              tempAdvantages.includes(option.value)
                                ? "bg-green-500 border-green-500"
                                : "border-gray-300 group-hover:border-green-300"
                            }`}
                          >
                            {tempAdvantages.includes(option.value) && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="font-medium leading-tight">
                            {option.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Items Bar for Advantages - Max 60% of modal height */}
          {tempAdvantages.length > 0 && (
            <div className="border-t bg-gray-50 p-4 flex-shrink-0 max-h-[60vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h5 className="font-medium text-gray-700 text-sm">
                  Các mục đã chọn ({tempAdvantages.length})
                </h5>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={scrollAdvantagesLeft}
                    className="w-6 h-6 bg-white hover:bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={scrollAdvantagesRight}
                    className="w-6 h-6 bg-white hover:bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>
              <div
                ref={advantagesScrollRef}
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth flex-1 min-h-0"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {tempAdvantages.map((value) => {
                  const option = Object.values(advantagesData)
                    .flatMap((category) => category.options)
                    .find((opt) => opt.value === value);
                  return option ? (
                    <div
                      key={value}
                      className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-green-200 flex-shrink-0"
                    >
                      <span className="font-medium">{option.label}</span>
                      <button
                        type="button"
                        onClick={() => toggleAdvantageOption(value)}
                        className="w-4 h-4 bg-green-200 hover:bg-green-300 rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-green-600" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-green-600">
                      {tempAdvantages.length}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {tempAdvantages.length === 0
                      ? "Chưa chọn mục nào"
                      : tempAdvantages.length === 1
                      ? "Đã chọn 1 mục"
                      : `Đã chọn ${tempAdvantages.length} mục`}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleAdvantagesReset}
                  className="px-6"
                >
                  Đặt lại
                </Button>
                <Button
                  onClick={handleAdvantagesApply}
                  className="px-6 bg-green-600 hover:bg-green-700"
                >
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