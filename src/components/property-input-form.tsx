'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
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
import { Home, Loader2, Cpu, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultAuthToken } from '@/lib/config';

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

type PropertyInputFormProps = {
  setResult: (data: CombinedResult | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  selectedLocation?: LocationData | null;
};

export function PropertyInputForm({
  setResult,
  setIsLoading,
  setError,
  selectedLocation,
}: PropertyInputFormProps) {
  const [useRealApi, setUseRealApi] = useState(true); // Default to real API
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
    }
  }, [selectedLocation, form]);

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
                    <Input 
                      placeholder="123 Đường ABC, Quận 1, TP. HCM" 
                      {...field}
                      className={selectedLocation ? 'bg-green-50 border-green-200' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                  {selectedLocation && (
                    <p className="text-xs text-green-600">
                      ✅ Địa chỉ được tự động điền từ vị trí đã chọn
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
