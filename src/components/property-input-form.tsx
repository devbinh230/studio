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
  address: z.string().min(5, 'Please enter a valid address.'),
  size: z.coerce.number().min(100, 'Size must be at least 100 sq ft.'),
  bedrooms: z.coerce.number().min(1, 'Must have at least 1 bedroom.'),
  bathrooms: z.coerce.number().min(1, 'Must have at least 1 bathroom.'),
  lotSize: z.coerce.number().min(100, 'Lot size must be at least 100 sq ft.'),
});

type PropertyInputFormProps = {
  setResult: (data: CombinedResult) => void;
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
      address: '123 Main St, Anytown, USA',
      size: 1800,
      bedrooms: 3,
      bathrooms: 2,
      lotSize: 5000,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null as any);

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
          Property Details
        </CardTitle>
        <CardDescription>
          Enter property information to get an AI-powered valuation.
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Anytown, USA" {...field} />
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
                    <FormLabel>Size (sq ft)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1800" {...field} />
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
                    <FormLabel>Lot Size (sq ft)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5000" {...field} />
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
                    <FormLabel>Bedrooms</FormLabel>
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
                    <FormLabel>Bathrooms</FormLabel>
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
                  Valuating...
                </>
              ) : (
                'Get Valuation'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
