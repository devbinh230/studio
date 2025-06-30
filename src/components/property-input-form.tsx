'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { getValuationAndSummary } from '@/app/actions';
import type { CombinedResult } from '@/lib/types';
import { Home, Loader2 } from 'lucide-react';

const formSchema = z.object({
  address: z.string().min(5, 'Vui lòng nhập địa chỉ hợp lệ.'),
  size: z.coerce.number().min(10, 'Diện tích phải lớn hơn 10m².'),
  bedrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng ngủ.'),
  bathrooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng tắm.'),
  lotSize: z.coerce.number().min(10, 'Diện tích lô đất phải lớn hơn 10m².'),
});

type PropertyInputFormProps = {
  setResult: (data: CombinedResult | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
};

export function PropertyInputForm({
  setResult,
  setIsLoading,
  setError,
}: PropertyInputFormProps) {
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const result = await getValuationAndSummary(values);

    if (result.success) {
      setResult(result.data);
    } else {
      setError(result.error);
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
          Nhập thông tin bất động sản để nhận định giá bằng AI.
        </CardDescription>
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
                    <Input placeholder="123 Đường ABC, Quận 1, TP. HCM" {...field} />
                  </FormControl>
                  <FormMessage />
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
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang định giá...
                </>
              ) : (
                'Xem định giá'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
